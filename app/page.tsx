"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "@/components/composer";
import { Conversation } from "@/components/conversation";
import { FocusTree } from "@/components/focus-tree";
import { Intake } from "@/components/intake";
import { TopBar } from "@/components/top-bar";
import { LearningProvider, useLearning } from "@/lib/learning-store";

function Workspace() {
  const {
    document,
    nodes,
    focusId,
    getPath,
    initializeLearning,
    askQuestion,
    answerState
  } = useLearning();
  const [treeOpen, setTreeOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [anchor, setAnchor] = useState<string | undefined>();
  const scrollRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const path = useMemo(() => (focusId ? getPath(focusId) : []), [focusId, getPath]);
  const activeResponseLength = path[path.length - 1]?.aiResponse.length ?? 0;

  const jumpToNode = (nodeId: string) => {
    const target = scrollRefs.current[nodeId];
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (answerState.status !== "streaming") return;
    const frame = window.requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [answerState.status, activeResponseLength, focusId]);

  if (!document || nodes.length === 0) {
    return <Intake onStart={initializeLearning} busy={answerState.status === "streaming"} />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <TopBar
        title={document.title}
        path={path}
        treeOpen={treeOpen}
        onToggleTree={() => setTreeOpen((value) => !value)}
      />
      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-0 overflow-y-auto px-5 pb-36 pt-6 lg:px-10">
          <Conversation
            path={path}
            focusId={focusId}
            registerNode={(id, element) => {
              scrollRefs.current[id] = element;
            }}
            onQuote={(text, mode) => {
              setAnchor(text);
              const prefix = mode === "explain" ? "解释这句话：" : mode === "expand" ? "展开讲讲：" : "";
              setDraft(`> ${text}\n\n${prefix}`);
            }}
          />
          <div ref={scrollAnchorRef} className="h-2" />
        </section>
        <FocusTree open={treeOpen} onJump={jumpToNode} />
      </main>
      <Composer
        draft={draft}
        anchor={anchor}
        disabled={answerState.status === "streaming"}
        onDraftChange={setDraft}
        onAnchorClear={() => setAnchor(undefined)}
        onSubmit={async (query, nextAnchor) => {
          await askQuestion(query, nextAnchor);
          setDraft("");
          setAnchor(undefined);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <LearningProvider>
      <Workspace />
    </LearningProvider>
  );
}
