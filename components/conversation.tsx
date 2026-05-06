"use client";

import { useEffect, useState } from "react";
import { useLearning } from "@/lib/learning-store";
import { MarkdownAnswer } from "@/components/markdown-answer";
import type { BubbleNode } from "@/lib/types";

interface ConversationProps {
  path: BubbleNode[];
  focusId: string | null;
  registerNode(id: string, element: HTMLElement | null): void;
  onQuote(text: string, mode: "ask" | "explain" | "expand"): void;
}

export function Conversation({ path, focusId, registerNode, onQuote }: ConversationProps) {
  const { answerState, toggleResolved, jumpToLastOnTopic } = useLearning();
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const close = () => setSelection(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  const captureSelection = () => {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    if (!selected || !text || text.length < 2) return;
    const range = selected.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 10 });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {path.map((node) => (
        <article
          key={node.id}
          ref={(element) => registerNode(node.id, element)}
          className={`rounded-lg border bg-white p-5 shadow-sm transition ${
            node.id === focusId ? "border-focus" : "border-line"
          } ${node.resolved ? "opacity-55" : ""}`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-normal text-muted">{node.parentId ? "追问" : "总览"}</p>
              <h2 className="mt-1 break-words text-lg font-semibold leading-7">{node.userQuery}</h2>
              {node.anchorText ? (
                <blockquote className="mt-3 border-l-2 border-focus bg-mist px-3 py-2 text-sm leading-6 text-muted">
                  {node.anchorText}
                </blockquote>
              ) : null}
            </div>
            <button
              className={`shrink-0 rounded-md border px-3 py-2 text-xs ${node.resolved ? "border-dashed border-muted text-muted" : "border-line text-ink"}`}
              type="button"
              onClick={() => toggleResolved(node.id)}
            >
              {node.resolved ? "恢复" : "已理解"}
            </button>
          </div>
          <div className="prose-answer text-[15px]" onMouseUp={captureSelection}>
            {node.aiResponse ? (
              <MarkdownAnswer content={node.aiResponse} />
            ) : answerState.status === "streaming" && answerState.nodeId === node.id ? (
              "正在组织讲解..."
            ) : null}
          </div>
          {answerState.status === "streaming" && answerState.nodeId === node.id ? (
            <span className="mt-3 inline-block h-5 w-1 animate-pulse bg-focus align-bottom" />
          ) : null}
          {node.isOffTopic && node.offTopicHint ? (
            <div className="mt-5 rounded-md border border-line bg-paper p-4 text-sm text-muted">
              <p>{node.offTopicHint}</p>
              <button className="mt-3 text-sm font-medium text-focus" type="button" onClick={jumpToLastOnTopic}>
                回到学习主线
              </button>
            </div>
          ) : null}
        </article>
      ))}

      {selection ? (
        <div
          className="fixed z-50 flex -translate-x-1/2 -translate-y-full overflow-hidden rounded-md border border-line bg-white shadow-soft"
          style={{ left: selection.x, top: selection.y }}
        >
          <button className="px-3 py-2 text-xs hover:bg-mist" type="button" onClick={() => onQuote(selection.text, "ask")}>
            追问
          </button>
          <button className="px-3 py-2 text-xs hover:bg-mist" type="button" onClick={() => onQuote(selection.text, "explain")}>
            解释
          </button>
          <button className="px-3 py-2 text-xs hover:bg-mist" type="button" onClick={() => onQuote(selection.text, "expand")}>
            展开
          </button>
        </div>
      ) : null}
    </div>
  );
}
