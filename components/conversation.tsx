"use client";

import { useEffect, useState } from "react";
import { useLearning } from "@/lib/learning-store";
import { MarkdownAnswer } from "@/components/markdown-answer";
import type { BubbleNode } from "@/lib/types";

interface ConversationProps {
  path: BubbleNode[];
  focusId: string | null;
  onJump(nodeId: string): void;
  registerNode(id: string, element: HTMLElement | null): void;
  onQuote(text: string, mode: "ask" | "explain" | "expand", nodeId: string): void;
}

export function Conversation({ path, focusId, onJump, registerNode, onQuote }: ConversationProps) {
  const { nodes, answerState, toggleResolved, jumpToLastOnTopic, stopStreaming, retryNode, setFocus, language } = useLearning();
  const [selection, setSelection] = useState<{ text: string; x: number; y: number; nodeId: string } | null>(null);

  useEffect(() => {
    const close = () => setSelection(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  const captureSelection = (nodeId: string) => {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    if (!selected || !text || text.length < 2) return;
    const range = selected.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 10, nodeId });
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
              <div className="flex items-center gap-3">
                <p className="text-xs font-medium uppercase tracking-normal text-muted">
                  {node.parentId 
                    ? (language === "en" ? "Follow-up" : "追问") 
                    : (language === "en" ? "Overview" : "总览")}
                </p>
                {node.batchId ? (() => {
                  const batchNodes = nodes.filter(n => n.batchId === node.batchId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                  if (batchNodes.length > 1) {
                    const idx = batchNodes.findIndex(n => n.id === node.id);
                    const nextNode = batchNodes[(idx + 1) % batchNodes.length];
                    return (
                      <button 
                        className="flex items-center gap-1 rounded bg-focus/10 px-2 py-0.5 text-[10px] font-semibold text-focus hover:bg-focus/20 transition-colors"
                        onClick={() => {
                          setFocus(nextNode.id);
                          onJump(nextNode.id);
                        }}
                        title={language === "en" ? "View next related question" : "查看下一关联问题"}
                      >
                        {language === "en" ? "Related Q" : "关联问题"} {idx + 1}/{batchNodes.length} ➔
                      </button>
                    )
                  }
                  return null;
                })() : null}
              </div>
              <h2 className="mt-1 break-words text-lg font-semibold leading-7 whitespace-pre-wrap">{node.userQuery}</h2>
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
              {node.resolved 
                ? (language === "en" ? "Restore" : "恢复") 
                : (language === "en" ? "Got it" : "已理解")}
            </button>
          </div>
          <div className="prose-answer text-[15px]" onMouseUp={() => captureSelection(node.id)}>
            {node.aiResponse ? (
              <MarkdownAnswer content={node.aiResponse} />
            ) : answerState.status === "streaming" && answerState.nodeId === node.id ? (
              language === "en" ? "Generating explanation..." : "正在组织讲解..."
            ) : null}
          </div>
          {answerState.status !== "streaming" || answerState.nodeId !== node.id ? (
            <div className="mt-2 flex justify-end gap-2">
              <button
                className="flex items-center gap-1.5 rounded border border-transparent px-2 py-1 text-xs text-muted transition-colors hover:border-line hover:bg-mist hover:text-ink"
                type="button"
                onClick={() => retryNode(node.id)}
                title={language === "en" ? "Regenerate" : "重新生成"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                {language === "en" ? "Retry" : "重试"}
              </button>
              {node.aiResponse ? <CopyButton text={node.aiResponse} /> : null}
            </div>
          ) : null}
          {answerState.status === "streaming" && answerState.nodeId === node.id ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-block h-5 w-1 animate-pulse bg-focus align-bottom" />
              <button
                className="flex items-center gap-1.5 rounded border border-line bg-paper px-2 py-1 text-xs text-muted hover:border-red-300 hover:text-red-700 transition-colors"
                type="button"
                onClick={stopStreaming}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                {language === "en" ? "Stop Generating" : "停止生成"}
              </button>
            </div>
          ) : null}
          {node.isOffTopic && node.offTopicHint ? (
            <div className="mt-5 rounded-md border border-line bg-paper p-4 text-sm text-muted">
              <p>{node.offTopicHint}</p>
              <button className="mt-3 text-sm font-medium text-focus" type="button" onClick={jumpToLastOnTopic}>
                {language === "en" ? "Back to core path" : "回到学习主线"}
              </button>
            </div>
          ) : null}
        </article>
      ))}

      {selection ? (() => {
        const popupText = language === "en" ? {
          ask: "Ask",
          explain: "Explain",
          expand: "Expand"
        } : {
          ask: "追问",
          explain: "解释",
          expand: "展开"
        };
        const handleAction = (mode: "ask" | "explain" | "expand") => {
          onQuote(selection.text, mode, selection.nodeId);
          setSelection(null);
          if (typeof window !== "undefined") {
            window.getSelection()?.removeAllRanges();
          }
        };
        return (
          <div
            className="fixed z-50 flex -translate-x-1/2 -translate-y-full overflow-hidden rounded-md border border-line bg-white shadow-soft"
            style={{ left: selection.x, top: selection.y }}
          >
            <button className="px-3 py-2 text-xs hover:bg-mist" type="button" onClick={() => handleAction("ask")}>
              {popupText.ask}
            </button>
            <button className="px-3 py-2 text-xs hover:bg-mist" type="button" onClick={() => handleAction("explain")}>
              {popupText.explain}
            </button>
            <button className="px-3 py-2 text-xs hover:bg-mist" type="button" onClick={() => handleAction("expand")}>
              {popupText.expand}
            </button>
          </div>
        );
      })() : null}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { language } = useLearning();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded border border-transparent px-2 py-1 text-xs text-muted transition-colors hover:border-line hover:bg-mist hover:text-ink"
      title={language === "en" ? "Copy content" : "复制内容"}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          {language === "en" ? "Copied" : "已复制"}
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 20 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          {language === "en" ? "Copy" : "复制"}
        </>
      )}
    </button>
  );
}

