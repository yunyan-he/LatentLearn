"use client";

import { useState, useRef, useEffect } from "react";
import { useLearning } from "@/lib/learning-store";
import type { DecomposedQuestion, QuestionPlan } from "@/lib/types";

interface ComposerProps {
  draft: string;
  disabled: boolean;
  autoDecompose: boolean;
  onAutoDecomposeChange(value: boolean): void;
  onDraftChange(value: string): void;
  onSubmit(query: string): Promise<void>;
}

export function Composer({ draft, disabled, autoDecompose, onAutoDecomposeChange, onDraftChange, onSubmit }: ComposerProps) {
  const { pendingPlan, setPendingPlan, confirmDecomposition, jumpToParent, answerState } = useLearning();
  const [localPending, setLocalPending] = useState<QuestionPlan | null>(null);
  const plan = pendingPlan ?? localPending;
  const questions = plan?.questions ?? [];

  const [isSent, setIsSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [draft]);

  const send = async () => {
    if (!draft.trim() || disabled) return;
    setIsSent(true);
    await onSubmit(draft);
    setTimeout(() => setIsSent(false), 2000);
  };

  return (
    <footer className="shrink-0 border-t border-line bg-white/92 px-4 py-3 backdrop-blur z-30">
      <div className="mx-auto max-w-4xl">
        {questions.length ? (
          <div className="mb-3 max-h-[48vh] overflow-y-auto rounded-lg border border-line bg-paper p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Question Planner 识别到 {questions.length} 个疑惑点</p>
                <p className="mt-1 text-xs leading-5 text-muted">{plan?.summary || "我会按更适合学习的顺序帮你逐个追问。"}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <button className="rounded border border-line bg-white px-2 py-1 text-xs text-muted hover:text-ink" type="button" onClick={() => updatePlan(questions.map((item) => ({ ...item, selected: true })))}>
                  全选
                </button>
                <button className="rounded border border-line bg-white px-2 py-1 text-xs text-muted hover:text-ink" type="button" onClick={() => updatePlan(questions.map((item) => ({ ...item, selected: false })))}>
                  清空
                </button>
                <button
                  className="rounded border border-line bg-white px-2 py-1 text-xs text-muted hover:text-ink"
                  type="button"
                  onClick={() => {
                    setPendingPlan(null);
                    setLocalPending(null);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-line bg-white p-3 text-sm">
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
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      className="grid size-8 place-items-center rounded border border-line bg-paper text-xs text-muted hover:border-focus hover:text-focus disabled:opacity-30"
                      type="button"
                      title="上移"
                      disabled={index === 0}
                      onClick={() => updatePlan(moveQuestion(questions, index, index - 1))}
                    >
                      ↑
                    </button>
                    <button
                      className="grid size-8 place-items-center rounded border border-line bg-paper text-xs text-muted hover:border-focus hover:text-focus disabled:opacity-30"
                      type="button"
                      title="下移"
                      disabled={index === questions.length - 1}
                      onClick={() => updatePlan(moveQuestion(questions, index, index + 1))}
                    >
                      ↓
                    </button>
                    <button
                      className="grid size-8 place-items-center rounded border border-line bg-paper text-xs text-muted hover:border-red-300 hover:text-red-700 disabled:opacity-30"
                      type="button"
                      title="删除"
                      disabled={questions.length <= 2}
                      onClick={() => updatePlan(questions.filter((item) => item.id !== question.id))}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <button className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-focus" type="button" onClick={() => updatePlan([...questions, createQuestion(questions.length)])}>
                新增问题
              </button>
              <button
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                type="button"
                disabled={disabled || !questions.some((question) => question.selected && question.query.trim())}
                onClick={() => {
                  confirmDecomposition(renumberQuestions(questions));
                  setLocalPending(null);
                }}
              >
                顺序追问
              </button>
            </div>
          </div>
        ) : null}

        <div className="mb-2 flex items-center justify-between px-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-ink transition-colors">
            <input
              type="checkbox"
              checked={autoDecompose}
              onChange={(e) => onAutoDecomposeChange(e.target.checked)}
              className="rounded border-line text-focus focus:ring-focus"
            />
            开启智能拆解 (Question Planner)
          </label>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
          <button
            className="grid h-11 place-items-center px-3 rounded-md border border-line bg-paper text-sm hover:border-focus disabled:opacity-35 transition-colors focus:bg-mist active:bg-mist"
            type="button"
            title="返回上一层"
            onClick={jumpToParent}
            disabled={disabled}
          >
            ↑ 返回上层
          </button>
          <textarea
            ref={textareaRef}
            className="max-h-36 min-h-11 resize-none rounded-md border border-line bg-paper px-4 py-3 text-sm leading-6 outline-none focus:border-focus"
            placeholder={answerState.status === "decomposing" ? "正在拆解问题..." : "继续追问... (Cmd/Ctrl + Enter 发送)"}
            value={draft}
            disabled={disabled}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            className={`h-11 rounded-md px-5 text-sm font-medium text-white disabled:cursor-not-allowed transition-all ${isSent ? "bg-emerald-600 hover:bg-emerald-600 disabled:opacity-100" : "bg-ink disabled:opacity-35"}`}
            type="button"
            disabled={disabled || (!draft.trim() && !isSent)}
            onClick={() => void send()}
          >
            {isSent ? "已发送 ✓" : "发送"}
          </button>
        </div>
      </div>
    </footer>
  );

  function updatePlan(nextQuestions: DecomposedQuestion[]) {
    const nextPlan = {
      summary: plan?.summary ?? "我会按更适合学习的顺序帮你逐个追问。",
      questions: renumberQuestions(nextQuestions)
    };
    setPendingPlan(nextPlan);
    setLocalPending(nextPlan);
  }
}

function moveQuestion(questions: DecomposedQuestion[], from: number, to: number) {
  const next = [...questions];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function createQuestion(index: number): DecomposedQuestion {
  return {
    id: `manual-${Date.now()}-${index}`,
    query: "",
    anchor: null,
    reason: "用户手动补充的问题。",
    order: index + 1,
    selected: true
  };
}

function renumberQuestions(questions: DecomposedQuestion[]) {
  return questions.map((question, index) => ({
    ...question,
    order: index + 1
  }));
}
