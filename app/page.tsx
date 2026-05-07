"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/composer";
import { Conversation } from "@/components/conversation";
import { FocusTree } from "@/components/focus-tree";
import { Intake } from "@/components/intake";
import { TopBar } from "@/components/top-bar";
import { HistorySidebar } from "@/components/history-sidebar";
import { LearningProvider, useLearning } from "@/lib/learning-store";

function Workspace() {
  const {
    sessionId,
    document,
    nodes,
    focusId,
    getPath,
    initializeLearning,
    loadSession,
    clearSession,
    askQuestion,
    answerState
  } = useLearning();
  const [treeOpen, setTreeOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [draft, setDraft] = useState("");
  const [autoDecompose, setAutoDecompose] = useState(false);
  const scrollRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const path = useMemo(() => (focusId ? getPath(focusId) : []), [focusId, getPath]);
  const activeResponseLength = path[path.length - 1]?.aiResponse.length ?? 0;

  const jumpToNode = (nodeId: string) => {
    setTimeout(() => {
      const target = scrollRefs.current[nodeId];
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  useEffect(() => {
    if (answerState.status !== "streaming") return;
    const frame = window.requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [answerState.status, activeResponseLength, focusId]);

  useEffect(() => {
    import("@/lib/storage").then(({ getLatestSession }) => {
      getLatestSession().then((session) => {
        if (session) {
          loadSession(session.id);
        }
        setInitialLoad(false);
      });
    });
  }, [loadSession]);

  if (initialLoad) {
    return <div className="flex h-dvh items-center justify-center bg-paper text-sm text-muted">加载中...</div>;
  }

  if (!document || nodes.length === 0) {
    return (
      <>
        <Intake onStart={initializeLearning} busy={answerState.status === "streaming"} />
        <HistorySidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelect={loadSession}
          onNew={clearSession}
          currentSessionId={sessionId}
        />
        {/* We add a small history button to Intake if it has no top bar, or just let them open it via TopBar when they have a document. Wait, Intake doesn't have TopBar. Let's add a floating history button to Intake */}
        <button
          className="fixed left-6 top-6 grid size-10 place-items-center rounded-md border border-line bg-white text-muted hover:bg-mist hover:text-ink shadow-sm"
          onClick={() => setHistoryOpen(true)}
          title="历史记录"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path><path d="M12 3v6"></path></svg>
        </button>
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <TopBar
        title={document.title}
        path={path}
        treeOpen={treeOpen}
        onToggleTree={() => setTreeOpen((value) => !value)}
        onToggleHistory={() => setHistoryOpen(true)}
      />
      <HistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={loadSession}
        onNew={clearSession}
        currentSessionId={sessionId}
      />
      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-0 overflow-y-auto px-5 pb-6 pt-6 lg:px-10">
          <Conversation
            path={path}
            focusId={focusId}
            registerNode={(id, element) => {
              scrollRefs.current[id] = element;
            }}
            onQuote={(text, mode) => {
              const prefix = mode === "explain" ? "解释这句话：" : mode === "expand" ? "展开讲讲：" : "我对此的疑问：";
              setDraft((prev) => {
                const addition = `> ${text}\n${prefix}`;
                return prev ? `${prev}\n\n${addition}` : addition;
              });
            }}
          />
          <div ref={scrollAnchorRef} className="h-2" />
        </section>
        <FocusTree open={treeOpen} onJump={jumpToNode} />
      </main>
      <Composer
        draft={draft}
        disabled={answerState.status === "streaming"}
        autoDecompose={autoDecompose}
        onAutoDecomposeChange={setAutoDecompose}
        onDraftChange={setDraft}
        onSubmit={async (query) => {
          setDraft("");
          void askQuestion(query, undefined, !autoDecompose);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <LearningProvider>
      <Workspace />
    </LearningProvider>
  );
}
