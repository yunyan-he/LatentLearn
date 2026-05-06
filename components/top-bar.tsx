"use client";

import type { BubbleNode } from "@/lib/types";
import { useLearning } from "@/lib/learning-store";

export function TopBar({
  title,
  path,
  treeOpen,
  onToggleTree,
  onToggleHistory
}: {
  title: string;
  path: BubbleNode[];
  treeOpen: boolean;
  onToggleTree(): void;
  onToggleHistory(): void;
}) {
  const { setFocus } = useLearning();

  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-line bg-white/86 px-4 backdrop-blur md:px-6">
      <button
        className="grid size-10 shrink-0 place-items-center rounded-md border border-transparent text-muted hover:bg-mist hover:text-ink transition-colors"
        type="button"
        title="历史对话"
        onClick={onToggleHistory}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path><path d="M12 3v6"></path></svg>
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <nav className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden text-xs text-muted">
          {path.map((node, index) => (
            <span key={node.id} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <span>/</span> : null}
              <button className="max-w-40 truncate hover:text-focus" type="button" onClick={() => setFocus(node.id)}>
                {node.userQuery}
              </button>
            </span>
          ))}
        </nav>
      </div>
      <button
        className="grid size-10 place-items-center rounded-md border border-line bg-paper text-lg hover:border-focus"
        type="button"
        title={treeOpen ? "收起焦点树" : "展开焦点树"}
        onClick={onToggleTree}
      >
        {treeOpen ? "›" : "‹"}
      </button>
    </header>
  );
}
