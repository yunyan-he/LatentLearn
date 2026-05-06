"use client";

import type { BubbleNode } from "@/lib/types";
import { useLearning } from "@/lib/learning-store";

export function TopBar({
  title,
  path,
  treeOpen,
  onToggleTree
}: {
  title: string;
  path: BubbleNode[];
  treeOpen: boolean;
  onToggleTree(): void;
}) {
  const { setFocus } = useLearning();

  return (
    <header className="flex min-h-16 items-center gap-4 border-b border-line bg-white/86 px-4 backdrop-blur md:px-6">
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
