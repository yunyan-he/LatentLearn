"use client";

import { useState } from "react";
import { useLearning } from "@/lib/learning-store";
import type { DecomposedQuestion, QuestionPlan } from "@/lib/types";

interface ComposerProps {
  draft: string;
  anchor?: string;
  disabled: boolean;
  onDraftChange(value: string): void;
  onAnchorClear(): void;
  onSubmit(query: string, anchor?: string): Promise<void>;
}

export function Composer({ draft, anchor, disabled, onDraftChange, onAnchorClear, onSubmit }: ComposerProps) {
  const { pendingPlan, setPendingPlan, confirmDecomposition, jumpToParent, answerState } = useLearning();
  const [localPending, setLocalPending] = useState<QuestionPlan | null>(null);
  const plan = pendingPlan ?? localPending;
  const questions = plan?.questions ?? [];

  const send = async () => {
    if (!draft.trim() || disabled) return;
    await onSubmit(draft, anchor);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white/92 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-4xl">
        {questions.length ? (
          <div className="mb-3 max-h-[48vh] overflow-y-auto rounded-lg border border-line bg-paper p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Question Planner 识别到 {questions.length} 个疑惑点</p>
                <p className="mt-1 text-xs leading-5 text-muted">{plan?.summary || "我会按更适合学习的顺序帮你逐个追问。"}</p>
              </div>
              <button
                className="text-xs text-muted hover:text-ink"
                type="button"
                onClick={() => {
                  setPendingPlan(null);
                  setLocalPending(null);
                }}
              >
                取消
              </button>
            </div>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-md border border-line bg-white p-3 text-sm">
                  <input
                    className="mt-3"
                    type="checkbox"
                    checked={question.selected}
                    onChange={(event) => {
                      const next = questions.map((item) => (item.id === question.id ? { ...item, selected: event.target.checked } : item));
                      updatePlan(next);
                    }}
                  />
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded bg-paper px-2 py-1">Q{question.order ?? index + 1}</span>
                      {question.anchor ? <span className="rounded bg-mist px-2 py-1">锚点：{question.anchor}</span> : null}
                    </div>
                    <input
                      className="w-full rounded-md border border-line bg-paper px-3 py-2 outline-none focus:border-focus"
                      value={question.query}
                      aria-label={`问题 ${index + 1}`}
                      onChange={(event) => {
                        const next = questions.map((item) => (item.id === question.id ? { ...item, query: event.target.value } : item));
                        updatePlan(next);
                      }}
                    />
                    {question.reason ? <p className="mt-2 text-xs leading-5 text-muted">{question.reason}</p> : null}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              type="button"
              disabled={disabled || !questions.some((question) => question.selected)}
              onClick={() => confirmDecomposition(questions)}
            >
              顺序追问
            </button>
          </div>
        ) : null}

        {anchor ? (
          <div className="mb-2 flex items-start gap-3 rounded-md border border-line bg-mist px-3 py-2 text-sm text-muted">
            <p className="line-clamp-2 min-w-0 flex-1">{anchor}</p>
            <button className="shrink-0 text-focus" type="button" onClick={onAnchorClear}>
              移除
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
          <button
            className="grid size-11 place-items-center rounded-md border border-line bg-paper text-lg hover:border-focus disabled:opacity-35"
            type="button"
            title="返回上一层"
            onClick={jumpToParent}
            disabled={disabled}
          >
            ↑
          </button>
          <textarea
            className="max-h-36 min-h-11 resize-none rounded-md border border-line bg-paper px-4 py-3 text-sm leading-6 outline-none focus:border-focus"
            placeholder={answerState.status === "decomposing" ? "正在拆解问题..." : "继续追问，Enter 发送"}
            value={draft}
            disabled={disabled}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="h-11 rounded-md bg-ink px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-35"
            type="button"
            disabled={disabled || !draft.trim()}
            onClick={() => void send()}
          >
            发送
          </button>
        </div>
      </div>
    </footer>
  );

  function updatePlan(nextQuestions: DecomposedQuestion[]) {
    const nextPlan = {
      summary: plan?.summary ?? "我会按更适合学习的顺序帮你逐个追问。",
      questions: nextQuestions
    };
    setPendingPlan(nextPlan);
    setLocalPending(nextPlan);
  }
}
