"use client";

import { useEffect, useState } from "react";
import { getAllSessions, deleteSession, type SessionMetadata } from "@/lib/storage";
import { useLearning } from "@/lib/learning-store";

interface HistorySidebarProps {
  open: boolean;
  onClose(): void;
  onSelect(id: string): void;
  onNew(): void;
  currentSessionId: string | null;
  autoDecompose: boolean;
  onAutoDecomposeChange(value: boolean): void;
}

export function HistorySidebar({
  open,
  onClose,
  onSelect,
  onNew,
  currentSessionId,
  autoDecompose,
  onAutoDecomposeChange
}: HistorySidebarProps) {
  const { language } = useLearning();
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load sessions", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmMsg = language === "en" 
      ? "Are you sure you want to delete this conversation?" 
      : "确定要删除这个对话吗？";
    if (!confirm(confirmMsg)) return;
    await deleteSession(id);
    if (id === currentSessionId) {
      onNew();
    } else {
      await loadSessions();
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-80 flex-col border-r border-line bg-paper shadow-2xl transition-transform">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">{language === "en" ? "History" : "历史对话"}</h2>
          <button className="grid size-8 place-items-center rounded-md hover:bg-mist" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <button
            onClick={() => {
              onNew();
              onClose();
            }}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-focus bg-focus/5 px-4 py-3 text-sm font-medium text-focus hover:bg-focus/10"
          >
            {language === "en" ? "+ Start New Learning" : "+ 开启新学习"}
          </button>

          {loading ? (
            <div className="p-4 text-center text-xs text-muted">{language === "en" ? "Loading..." : "加载中..."}</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted">{language === "en" ? "No history records" : "暂无历史记录"}</div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelect(session.id);
                    onClose();
                  }}
                  className={`group relative cursor-pointer rounded-md border px-3 py-3 transition-colors ${
                    session.id === currentSessionId
                      ? "border-focus bg-mist"
                      : "border-transparent hover:bg-mist"
                  }`}
                >
                  <p className="line-clamp-2 text-sm font-medium text-ink pr-6 leading-relaxed">
                    {session.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {mounted ? new Date(session.updatedAt).toLocaleString(language === "en" ? "en-US" : "zh-CN") : ""}
                  </p>
                  
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="absolute right-2 top-3 hidden rounded p-1 text-muted hover:bg-white hover:text-red-600 group-hover:block"
                    title={language === "en" ? "Delete" : "删除"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Settings Toggle Block */}
        <div className="border-t border-line bg-white/50 p-4 shrink-0">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-sm hover:border-focus transition-all">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-ink leading-none block">
                {language === "en" ? "Question Planner" : "智能问题拆解"}
              </span>
              <span className="text-[10px] text-muted leading-tight mt-1.5 block">
                {language === "en" 
                  ? "Pre-structure complex questions" 
                  : "自动规划并拆解复杂追问"}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoDecompose}
                onChange={(e) => onAutoDecomposeChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-line rounded-full peer peer-checked:bg-focus after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
            </label>
          </div>
        </div>
      </aside>
    </>
  );
}
