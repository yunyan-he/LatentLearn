"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/composer";
import { Conversation } from "@/components/conversation";
import { FocusTree } from "@/components/focus-tree";
import { Intake } from "@/components/intake";
import { TopBar } from "@/components/top-bar";
import { HistorySidebar } from "@/components/history-sidebar";
import { LearningProvider, useLearning } from "@/lib/learning-store";
import type { QuoteRef } from "@/lib/types";

function Workspace() {
  const {
    sessionId,
    document,
    nodes,
    focusId,
    getPath,
    initializeLearning,
    loadSession,
    clearSession,
    askQuestion,
    answerState,
    language
  } = useLearning();
  const [treeOpen, setTreeOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [draft, setDraft] = useState("");
  const [autoDecompose, setAutoDecompose] = useState(true);
  const [quoteRefs, setQuoteRefs] = useState<QuoteRef[]>([]);
  const [shouldShowScrollDown, setShouldShowScrollDown] = useState(false);
  const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);
  const scrollRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const isAtBottomRef = useRef(true);
  const lastTouchYRef = useRef<number | null>(null);
  const path = useMemo(() => (focusId ? getPath(focusId) : []), [focusId, getPath]);

  const handleScrollToBottom = () => {
    isAtBottomRef.current = true;
    setShouldShowScrollDown(false);
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const threshold = 80;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    isAtBottomRef.current = isAtBottom;

    if (answerState.status === "streaming") {
      setShouldShowScrollDown(!isAtBottom);
    } else {
      setShouldShowScrollDown(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (e.deltaY < 0) {
      // Scrolling up
      isAtBottomRef.current = false;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    if (touch) {
      lastTouchYRef.current = touch.clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    if (touch && lastTouchYRef.current !== null) {
      const deltaY = touch.clientY - lastTouchYRef.current;
      if (deltaY > 0) {
        // Dragging finger down, which scrolls the view up (to read history)
        isAtBottomRef.current = false;
      }
      lastTouchYRef.current = touch.clientY;
    }
  };
  const activeResponseLength = path[path.length - 1]?.aiResponse.length ?? 0;

  const jumpToNode = (nodeId: string) => {
    setPendingJumpId(nodeId);
  };

  useEffect(() => {
    if (answerState.status !== "streaming" || !isAtBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [answerState.status, activeResponseLength, focusId]);

  useEffect(() => {
    import("@/lib/storage").then(({ getLatestSession }) => {
      getLatestSession().then((session) => {
        if (session) {
          loadSession(session.id);
        }
        setInitialLoad(false);
      });
    });
  }, [loadSession]);

  useEffect(() => {
    if (!draft.trim()) {
      setQuoteRefs([]);
    }
  }, [draft]);

  useEffect(() => {
    if (answerState.status !== "streaming") {
      setShouldShowScrollDown(false);
    }
  }, [answerState.status]);

  useEffect(() => {
    if (!pendingJumpId) return;
    let cancelled = false;
    const scroll = () => {
      if (cancelled) return;
      const target = scrollRefs.current[pendingJumpId];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingJumpId(null);
      } else {
        window.requestAnimationFrame(scroll);
      }
    };
    window.requestAnimationFrame(scroll);
    return () => {
      cancelled = true;
    };
  }, [pendingJumpId, path]);

  const findLCA = (nodeIds: string[]) => {
    if (nodeIds.length === 0) return undefined;
    if (nodeIds.length === 1) return nodeIds[0];
    
    const paths = nodeIds.map(id => getPath(id));
    if (paths.some(p => p.length === 0)) return undefined;

    let lca = paths[0][0];
    for (let i = 0; i < paths[0].length; i++) {
      const candidate = paths[0][i];
      const isCommon = paths.every(path => path[i] && path[i].id === candidate.id);
      if (isCommon) {
        lca = candidate;
      } else {
        break;
      }
    }
    return lca.id;
  };

  if (initialLoad) {
    return <div className="flex h-dvh items-center justify-center bg-paper text-sm text-muted">加载中...</div>;
  }

  if (!document || nodes.length === 0) {
    return (
      <>
        <Intake onStart={initializeLearning} busy={answerState.status === "streaming"} />
        <HistorySidebar
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelect={loadSession}
          onNew={clearSession}
          currentSessionId={sessionId}
        />
        {/* We add a small history button to Intake if it has no top bar, or just let them open it via TopBar when they have a document. Wait, Intake doesn't have TopBar. Let's add a floating history button to Intake */}
        <button
          className="fixed left-6 top-6 grid size-10 place-items-center rounded-md border border-line bg-white text-muted hover:bg-mist hover:text-ink shadow-sm"
          onClick={() => setHistoryOpen(true)}
          title="历史记录"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path><path d="M12 3v6"></path></svg>
        </button>
      </>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <TopBar
        title={document.title}
        path={path}
        treeOpen={treeOpen}
        onToggleTree={() => setTreeOpen((value) => !value)}
        onToggleHistory={() => setHistoryOpen(true)}
      />
      <HistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={loadSession}
        onNew={clearSession}
        currentSessionId={sessionId}
      />
      <main className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden transition-all duration-300 ${
        treeOpen 
          ? "lg:grid-cols-[minmax(0,1fr)_340px]" 
          : "lg:grid-cols-[minmax(0,1fr)_48px]"
      }`}>
        <section
          ref={containerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="relative min-h-0 overflow-y-auto px-5 pb-6 pt-6 lg:px-10"
        >
          <Conversation
            path={path}
            focusId={focusId}
            onJump={jumpToNode}
            registerNode={(id, element) => {
              scrollRefs.current[id] = element;
            }}
            onQuote={(text, mode, nodeId) => {
              const prefix = language === "en"
                ? (mode === "explain" ? "Explain this: " : mode === "expand" ? "Expand on this: " : "My question about this: ")
                : (mode === "explain" ? "解释这句话：" : mode === "expand" ? "展开讲讲：" : "我对此的疑问：");
              setQuoteRefs((prev) => [...prev, { nodeId, text }]);
              setDraft((prev) => {
                const addition = `> ${text}\n${prefix}`;
                return prev ? `${prev}\n\n${addition}` : addition;
              });
            }}
          />
          <div ref={scrollAnchorRef} className="h-2" />
          {shouldShowScrollDown && (
            <button
              onClick={handleScrollToBottom}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-focus px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-focus/90 active:scale-95 animate-bounce z-40"
              title={language === "en" ? "Scroll to live output" : "下滑跟随生成"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
              <span>{language === "en" ? "Scroll to Live Output" : "下滑跟随生成"}</span>
            </button>
          )}
        </section>
        <FocusTree open={treeOpen} onJump={jumpToNode} />
      </main>
      <Composer
        draft={draft}
        disabled={answerState.status === "streaming"}
        autoDecompose={autoDecompose}
        onAutoDecomposeChange={setAutoDecompose}
        onDraftChange={setDraft}
        onSubmit={async (query) => {
          const refs = quoteRefs;
          const customParentId = findLCA(refs.map((ref) => ref.nodeId));
          const anchorText = formatQuoteRefs(refs, language);
          setDraft("");
          setQuoteRefs([]);
          isAtBottomRef.current = true;
          void askQuestion(query, anchorText || undefined, !autoDecompose, customParentId, undefined, refs);
        }}
      />
    </div>
  );
}


function formatQuoteRefs(refs: QuoteRef[], language: string) {
  if (!refs.length) return "";
  const prefix = language === "en" ? "Quote" : "引用";
  return refs.map((ref, index) => `${prefix} ${index + 1}: ${ref.text}`).join("\n\n");
}

export default function Home() {
  return (
    <LearningProvider>
      <Workspace />
    </LearningProvider>
  );
}
