"use client";

import { useLearning } from "@/lib/learning-store";
import type { BubbleNode } from "@/lib/types";

export function FocusTree({ open, onJump }: { open: boolean; onJump(nodeId: string): void }) {
  const { nodes, focusId, setFocus, toggleResolved } = useLearning();
  const roots = nodes.filter((node) => node.parentId === null);

  if (!open) {
    return (
      <aside className="hidden border-l border-line bg-white lg:block">
        <div className="grid h-full place-items-center text-xs text-muted [writing-mode:vertical-rl]">焦点树已折叠</div>
      </aside>
    );
  }

  return (
    <aside className="mobile-drawer hidden min-h-0 overflow-y-auto border-l border-line bg-white p-4 lg:block">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">焦点树</h2>
        <p className="text-xs text-muted">{nodes.length} 个节点</p>
      </div>
      <div className="space-y-2">
        {roots.map((node) => (
          <TreeNode key={node.id} node={node} allNodes={nodes} focusId={focusId} depth={0} onFocus={setFocus} onJump={onJump} onResolve={toggleResolved} />
        ))}
      </div>
    </aside>
  );
}

function TreeNode({
  node,
  allNodes,
  focusId,
  depth,
  onFocus,
  onJump,
  onResolve
}: {
  node: BubbleNode;
  allNodes: BubbleNode[];
  focusId: string | null;
  depth: number;
  onFocus(nodeId: string): void;
  onJump(nodeId: string): void;
  onResolve(nodeId: string): void;
}) {
  const children = node.children.map((id) => allNodes.find((item) => item.id === id)).filter(Boolean) as BubbleNode[];
  const active = node.id === focusId;

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-2 rounded-md px-2 py-2 animate-grow ${active ? "bg-mist" : "hover:bg-paper"} ${
          node.resolved ? "animate-fadeShrink opacity-55" : ""
        }`}
        style={{ marginLeft: depth * 18 }}
      >
        <button
          className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs ${
            active
              ? "border-focus bg-focus font-semibold text-white"
              : node.resolved
                ? "border-dashed border-muted text-muted"
                : "border-line bg-white text-ink"
          }`}
          type="button"
          title="切换焦点"
          onClick={() => {
            onFocus(node.id);
            onJump(node.id);
          }}
        >
          {node.children.length || "·"}
        </button>
        <button
          className={`min-w-0 flex-1 truncate text-left text-sm ${active ? "font-semibold text-focus" : "text-ink"}`}
          type="button"
          onClick={() => {
            onFocus(node.id);
            onJump(node.id);
          }}
        >
          {node.userQuery}
        </button>
        <button
          className="hidden rounded px-2 py-1 text-xs text-muted hover:bg-white group-hover:block"
          type="button"
          onClick={() => onResolve(node.id)}
        >
          {node.resolved ? "恢复" : "懂了"}
        </button>
      </div>
      {children.length ? (
        <div className="tree-branch relative ml-4">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              allNodes={allNodes}
              focusId={focusId}
              depth={depth + 1}
              onFocus={onFocus}
              onJump={onJump}
              onResolve={onResolve}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
