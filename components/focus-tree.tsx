import { useState, useEffect } from "react";
import { useLearning } from "@/lib/learning-store";
import type { BubbleNode } from "@/lib/types";

export function FocusTree({ open, onJump }: { open: boolean; onJump(nodeId: string): void }) {
  const { nodes, focusId, setFocus, toggleResolved, getPath, deleteNode, language } = useLearning();
  const roots = nodes.filter((node) => node.parentId === null);
  const pathIds = new Set(focusId ? getPath(focusId).map(n => n.id) : []);

  const [isPruneMode, setIsPruneMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggleSelect = (nodeId: string) => {
    setSelectedForDelete((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleConfirmDelete = () => {
    const toDeleteArray = Array.from(selectedForDelete);
    
    // Sort nodes to prevent deleting descendants multiple times (redundantly)
    // Filter out any selected node that has an ancestor also selected
    const rootsToDelete = toDeleteArray.filter(nodeId => {
      const path = getPath(nodeId);
      return !path.slice(0, -1).some(ancestor => selectedForDelete.has(ancestor.id));
    });

    rootsToDelete.forEach(nodeId => {
      deleteNode(nodeId);
    });

    setSelectedForDelete(new Set());
    setIsPruneMode(false);
    setShowConfirm(false);
  };

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
    <aside className="mobile-drawer hidden min-h-0 flex-col border-l border-line bg-white lg:flex w-64 shrink-0 relative">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{language === "en" ? "Focus Tree" : "焦点树"}</h2>
          <p className="text-xs text-muted">
            {language === "en" ? `${nodes.length} nodes` : `${nodes.length} 个节点`}
          </p>
        </div>
        <div className="space-y-1">
          {roots.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              allNodes={nodes}
              focusId={focusId}
              pathIds={pathIds}
              depth={0}
              onFocus={setFocus}
              onJump={onJump}
              onResolve={toggleResolved}
              isPruneMode={isPruneMode}
              selectedForDelete={selectedForDelete}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      </div>

      {/* Floating control action button/pill inside bottom right */}
      {!isPruneMode ? (
        <button
          className="absolute bottom-4 right-4 z-20 flex size-9 items-center justify-center rounded-full border border-line bg-white/85 backdrop-blur shadow-sm text-muted hover:border-focus hover:text-focus hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          onClick={() => {
            setIsPruneMode(true);
            setSelectedForDelete(new Set());
            setShowConfirm(false);
          }}
          title={language === "en" ? "Prune Branches" : "裁剪分支"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <line x1="9.8" y1="8.2" x2="21" y2="19"></line>
            <line x1="9.8" y1="15.8" x2="21" y2="5"></line>
          </svg>
        </button>
      ) : !showConfirm ? (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-line bg-white/90 backdrop-blur p-1 shadow-md animate-grow">
          <button
            className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink transition-colors cursor-pointer"
            onClick={() => {
              setIsPruneMode(false);
              setSelectedForDelete(new Set());
            }}
            title={language === "en" ? "Cancel" : "取消"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button
            className={`relative flex size-7 items-center justify-center rounded-full transition-all ${
              selectedForDelete.size > 0
                ? "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                : "bg-red-200 text-red-50 cursor-not-allowed opacity-60"
            }`}
            disabled={selectedForDelete.size === 0}
            onClick={() => setShowConfirm(true)}
            title={language === "en" ? `Delete selected (${selectedForDelete.size})` : `删除选中 (${selectedForDelete.size})`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            {selectedForDelete.size > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-bold text-white ring-1 ring-white">
                {selectedForDelete.size}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50/95 backdrop-blur p-2.5 shadow-lg w-48 text-center animate-grow">
          <p className="text-[10px] leading-4 text-red-700 font-semibold">
            {language === "en"
              ? `Delete these ${selectedForDelete.size} branches?`
              : `确认删除选中的 ${selectedForDelete.size} 个分支吗？`}
          </p>
          <div className="flex w-full gap-1.5">
            <button
              className="flex-1 rounded bg-white border border-red-200 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              onClick={() => setShowConfirm(false)}
            >
              {language === "en" ? "Cancel" : "取消"}
            </button>
            <button
              className="flex-1 rounded bg-red-600 py-1 text-[9px] font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
              onClick={handleConfirmDelete}
            >
              {language === "en" ? "Confirm" : "确认"}
            </button>
          </div>
        </div>
      )}
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
  onResolve,
  isPruneMode,
  selectedForDelete,
  onToggleSelect
}: {
  node: BubbleNode;
  allNodes: BubbleNode[];
  focusId: string | null;
  pathIds: Set<string>;
  depth: number;
  onFocus(nodeId: string): void;
  onJump(nodeId: string): void;
  onResolve(nodeId: string): void;
  isPruneMode: boolean;
  selectedForDelete: Set<string>;
  onToggleSelect(nodeId: string): void;
}) {
  const { getPath, language } = useLearning();
  const children = node.children.map((id) => allNodes.find((item) => item.id === id)).filter(Boolean) as BubbleNode[];
  const active = node.id === focusId;
  const inPath = pathIds.has(node.id);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (inPath) setExpanded(true);
  }, [inPath]);

  // Check if implicitly selected because of parent or ancestor selection
  const implicitlySelected = node.parentId
    ? getPath(node.id).slice(0, -1).some((n) => selectedForDelete.has(n.id))
    : false;
  const isChecked = selectedForDelete.has(node.id) || implicitlySelected;

  return (
    <div className="relative">
      <div
        className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 animate-grow ${active ? "bg-mist" : "hover:bg-paper"} ${
          node.resolved ? "animate-fadeShrink opacity-55" : ""
        } ${isChecked ? "bg-red-50/40 hover:bg-red-50/60" : ""}`}
        style={{ marginLeft: depth * 14 }}
      >
        {isPruneMode && node.parentId ? (
          <button
            type="button"
            className="flex size-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!implicitlySelected) {
                onToggleSelect(node.id);
              }
            }}
            style={{
              borderColor: isChecked ? "#ef4444" : "#d1d5db",
              backgroundColor: isChecked ? (implicitlySelected ? "#fee2e2" : "#ef4444") : "transparent",
              color: isChecked ? (implicitlySelected ? "#ef4444" : "#ffffff") : "transparent"
            }}
            title={
              implicitlySelected
                ? (language === "en" ? "Will be deleted with parent" : "将随父分支一起删除")
                : (language === "en" ? "Toggle selection" : "切换选中")
            }
          >
            {isChecked && (
              implicitlySelected ? (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              ) : (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )
            )}
          </button>
        ) : null}

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

        {node.resolved && (
          <span className="shrink-0 flex size-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 animate-grow" title={language === "en" ? "Resolved" : "已完成"}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        )}

        {children.length > 0 && (
          <span className="shrink-0 text-[10px] font-medium text-muted bg-paper px-1.5 rounded">
            {children.length}
          </span>
        )}

        {!isPruneMode && (
          <button
            className="hidden shrink-0 rounded px-2 py-1 text-[11px] text-muted hover:bg-white group-hover:block transition-colors cursor-pointer"
            type="button"
            onClick={() => onResolve(node.id)}
          >
            {node.resolved 
              ? (language === "en" ? "Restore" : "恢复") 
              : (language === "en" ? "Got it" : "懂了")}
          </button>
        )}
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
              isPruneMode={isPruneMode}
              selectedForDelete={selectedForDelete}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
