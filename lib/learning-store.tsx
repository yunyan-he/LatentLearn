"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTopicDocument, parseMarkdownFile } from "@/lib/document";
import { decomposeQuery, streamFollowUp, streamInitialOverview } from "@/lib/llm-client";
import { parseOffTopic } from "@/lib/mock-ai";
import type { AnswerState, BubbleNode, DecomposedQuestion, LearningDocument, QuestionPlan } from "@/lib/types";
import { saveSession, getSession, type LearningSession } from "@/lib/storage";

interface LearningStore {
  sessionId: string | null;
  document: LearningDocument | null;
  nodes: BubbleNode[];
  focusId: string | null;
  answerState: AnswerState;
  pendingPlan: QuestionPlan | null;
  initializeLearning(input: { kind: "file"; name: string; content: string } | { kind: "topic"; topic: string }): Promise<void>;
  loadSession(id: string): Promise<void>;
  clearSession(): void;
  askQuestion(query: string, anchorText?: string, skipDecomposition?: boolean): Promise<void>;
  confirmDecomposition(questions: DecomposedQuestion[]): Promise<void>;
  setPendingPlan(plan: QuestionPlan | null): void;
  setFocus(nodeId: string): void;
  toggleResolved(nodeId: string): void;
  jumpToParent(): void;
  jumpToLastOnTopic(): void;
  getPath(nodeId: string): BubbleNode[];
  getNode(nodeId: string): BubbleNode | undefined;
}

const LearningContext = createContext<LearningStore | null>(null);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [document, setDocument] = useState<LearningDocument | null>(null);
  const [nodes, setNodes] = useState<BubbleNode[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>({ status: "idle" });
  const [pendingPlan, setPendingPlan] = useState<QuestionPlan | null>(null);

  useEffect(() => {
    if (sessionId && document && nodes.length > 0) {
      saveSession({
        id: sessionId,
        document,
        nodes,
        focusId,
        updatedAt: Date.now()
      }).catch(console.error);
    }
  }, [sessionId, document, nodes, focusId]);

  const getNode = useCallback((nodeId: string) => nodes.find((node) => node.id === nodeId), [nodes]);

  const getPath = useCallback(
    (nodeId: string) => {
      const byId = new Map(nodes.map((node) => [node.id, node]));
      const path: BubbleNode[] = [];
      let cursor = byId.get(nodeId);
      while (cursor) {
        path.unshift(cursor);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
      return path;
    },
    [nodes]
  );

  const updateNode = useCallback((nodeId: string, patch: Partial<BubbleNode> | ((node: BubbleNode) => Partial<BubbleNode>)) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;
        const nextPatch = typeof patch === "function" ? patch(node) : patch;
        return { ...node, ...nextPatch };
      })
    );
  }, []);

  const appendChild = useCallback((parentId: string | null, node: BubbleNode) => {
    setNodes((current) => {
      const withParent = parentId
        ? current.map((item) => (item.id === parentId ? { ...item, children: [...item.children, node.id] } : item))
        : current;
      return [...withParent, node];
    });
  }, []);

  const initializeLearning: LearningStore["initializeLearning"] = useCallback(async (input) => {
    const nextDocument = input.kind === "file" ? parseMarkdownFile(input.name, input.content) : createTopicDocument(input.topic);
    const rootId = createId();
    const newSessionId = createId();
    const root: BubbleNode = {
      id: rootId,
      parentId: null,
      userQuery: "总览",
      aiResponse: "",
      isOffTopic: false,
      resolved: false,
      createdAt: new Date(),
      children: []
    };

    setSessionId(newSessionId);
    setDocument(nextDocument);
    setNodes([root]);
    setFocusId(rootId);
    setAnswerState({ status: "streaming", nodeId: rootId, label: "正在生成总览" });

    let response = "";
    try {
      for await (const chunk of streamInitialOverview(nextDocument)) {
        response += chunk;
        updateNode(rootId, { aiResponse: response });
      }
    } catch (error) {
      updateNode(rootId, { aiResponse: formatLlmError(error) });
    }
    setAnswerState({ status: "idle" });
  }, [updateNode]);

  const loadSession = useCallback(async (id: string) => {
    const session = await getSession(id);
    if (session) {
      setSessionId(session.id);
      setDocument(session.document);
      setNodes(session.nodes);
      setFocusId(session.focusId);
      setAnswerState({ status: "idle" });
      setPendingPlan(null);
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionId(null);
    setDocument(null);
    setNodes([]);
    setFocusId(null);
    setAnswerState({ status: "idle" });
    setPendingPlan(null);
  }, []);

  const askQuestion: LearningStore["askQuestion"] = useCallback(
    async (query, anchorText, skipDecomposition = false) => {
      if (!document || !focusId) return;
      const cleaned = query.trim();
      if (!cleaned) return;

      if (!skipDecomposition) {
        setAnswerState({ status: "decomposing" });
        const plan = await safeDecompose(document, cleaned);
        setAnswerState({ status: "idle" });
        if (plan.questions.length > 1) {
          setPendingPlan(plan);
          return;
        }
      }

      const parentId = focusId;
      const nodeId = createId();
      const node: BubbleNode = {
        id: nodeId,
        parentId,
        anchorText,
        userQuery: cleaned,
        aiResponse: "",
        isOffTopic: false,
        resolved: false,
        createdAt: new Date(),
        children: []
      };
      appendChild(parentId, node);
      setFocusId(nodeId);
      setAnswerState({ status: "streaming", nodeId, label: "正在回答" });

      let raw = "";
      const path = getPath(parentId);
      try {
        for await (const chunk of streamFollowUp(document, path, cleaned, anchorText)) {
          raw += chunk;
          const parsed = parseOffTopic(raw);
          updateNode(nodeId, {
            aiResponse: parsed.answer,
            isOffTopic: parsed.isOffTopic,
            offTopicHint: parsed.hint
          });
        }
      } catch (error) {
        updateNode(nodeId, { aiResponse: formatLlmError(error) });
      }
      setAnswerState({ status: "idle" });
    },
    [appendChild, document, focusId, getPath, updateNode]
  );

  const confirmDecomposition = useCallback(
    async (questions: DecomposedQuestion[]) => {
      setPendingPlan(null);
      const selected = questions
        .filter((item) => item.selected && item.query.trim())
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
      for (const question of selected) {
        await askQuestion(question.query, question.anchor ?? undefined, true);
      }
    },
    [askQuestion]
  );

  const toggleResolved = useCallback(
    (nodeId: string) => updateNode(nodeId, (node) => ({ resolved: !node.resolved })),
    [updateNode]
  );

  const jumpToParent = useCallback(() => {
    if (!focusId) return;
    const parentId = nodes.find((node) => node.id === focusId)?.parentId;
    if (parentId) setFocusId(parentId);
  }, [focusId, nodes]);

  const jumpToLastOnTopic = useCallback(() => {
    if (!focusId) return;
    const path = getPath(focusId);
    const target = [...path].reverse().find((node) => !node.isOffTopic);
    if (target) setFocusId(target.id);
  }, [focusId, getPath]);

  const value = useMemo<LearningStore>(
    () => ({
      sessionId,
      document,
      nodes,
      focusId,
      answerState,
      pendingPlan,
      initializeLearning,
      loadSession,
      clearSession,
      askQuestion,
      confirmDecomposition,
      setPendingPlan,
      setFocus: setFocusId,
      toggleResolved,
      jumpToParent,
      jumpToLastOnTopic,
      getPath,
      getNode
    }),
    [
      sessionId,
      answerState,
      askQuestion,
      confirmDecomposition,
      document,
      focusId,
      getNode,
      getPath,
      initializeLearning,
      loadSession,
      clearSession,
      jumpToLastOnTopic,
      jumpToParent,
      nodes,
      pendingPlan,
      toggleResolved
    ]
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const store = useContext(LearningContext);
  if (!store) throw new Error("useLearning must be used inside LearningProvider");
  return store;
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function safeDecompose(document: LearningDocument, query: string) {
  try {
    return await decomposeQuery(document, query);
  } catch {
    return {
      summary: "拆解失败，直接按原问题回答。",
      questions: []
    };
  }
}

function formatLlmError(error: unknown) {
  const message = error instanceof Error ? error.message : "未知错误";
  return `LLM 调用失败：${message}`;
}
