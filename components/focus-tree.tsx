import { useState, useEffect } from "react";
import { useLearning } from "@/lib/learning-store";
import type { BubbleNode } from "@/lib/types";

export function FocusTree({ open, onJump }: { open: boolean; onJump(nodeId: string): void }) {
  const { nodes, focusId, setFocus, toggleResolved, getPath, language } = useLearning();
  const roots = nodes.filter((node) => node.parentId === null);
  const pathIds = new Set(focusId ? getPath(focusId).map(n => n.id) : []);

  if (!open) {
    return (
      <aside className="hidden border-l border-line bg-white lg:block">
        <div className="grid h-full place-items-center text-xs text-muted [writing-mode:vertical-rl]">
          {language === "en" ? "Focus tree collapsed" : "焦点树已折叠"}
        </div>
      </aside>
    );
  }

  return (
    <aside className="mobile-drawer hidden min-h-0 overflow-y-auto border-l border-line bg-white p-4 lg:block">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{language === "en" ? "Focus Tree" : "焦点树"}</h2>
        <p className="text-xs text-muted">
          {language === "en" ? `${nodes.length} nodes` : `${nodes.length} 个节点`}
        </p>
      </div>
      <div className="space-y-1">
        {roots.map((node) => (
          <TreeNode key={node.id} node={node} allNodes={nodes} focusId={focusId} pathIds={pathIds} depth={0} onFocus={setFocus} onJump={onJump} onResolve={toggleResolved} />
        ))}
      </div>
    </aside>
  );
}

function TreeNode({
  node,
  allNodes,
  focusId,
  pathIds,
  depth,
  onFocus,
  onJump,
  onResolve
}: {
  node: BubbleNode;
  allNodes: BubbleNode[];
  focusId: string | null;
  pathIds: Set<string>;
  depth: number;
  onFocus(nodeId: string): void;
  onJump(nodeId: string): void;
  onResolve(nodeId: string): void;
}) {
  const { language } = useLearning();
  const children = node.children.map((id) => allNodes.find((item) => item.id === id)).filter(Boolean) as BubbleNode[];
  const active = node.id === focusId;
  const inPath = pathIds.has(node.id);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (inPath) setExpanded(true);
  }, [inPath]);

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 animate-grow ${active ? "bg-mist" : "hover:bg-paper"} ${
          node.resolved ? "animate-fadeShrink opacity-55" : ""
        }`}
        style={{ marginLeft: depth * 14 }}
      >
        <button
          className={`grid size-5 shrink-0 place-items-center rounded text-muted hover:bg-line/50 transition-transform ${expanded ? "rotate-90" : ""}`}
          style={{ visibility: children.length ? "visible" : "hidden" }}
          type="button"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? (language === "en" ? "Collapse" : "收起") : (language === "en" ? "Expand" : "展开")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        <button
          className={`min-w-0 flex-1 truncate text-left text-sm transition-colors ${active ? "font-semibold text-focus" : "text-ink hover:text-focus"}`}
          type="button"
          onClick={() => {
            onFocus(node.id);
            onJump(node.id);
          }}
          title={node.userQuery}
        >
          {node.userQuery}
        </button>

        {children.length > 0 && (
          <span className="shrink-0 text-[10px] font-medium text-muted bg-paper px-1.5 rounded">
            {children.length}
          </span>
        )}

        <button
          className="hidden shrink-0 rounded px-2 py-1 text-[11px] text-muted hover:bg-white group-hover:block transition-colors"
          type="button"
          onClick={() => onResolve(node.id)}
        >
          {node.resolved 
            ? (language === "en" ? "Restore" : "恢复") 
            : (language === "en" ? "Got it" : "懂了")}
        </button>
      </div>
      {expanded && children.length > 0 ? (
        <div className="tree-branch relative ml-2 mt-1 space-y-1">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              allNodes={allNodes}
              focusId={focusId}
              pathIds={pathIds}
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
