"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

interface IntakeProps {
  busy: boolean;
  onStart(input: { kind: "file"; name: string; content: string } | { kind: "topic"; topic: string }): void;
}

export function Intake({ busy, onStart }: IntakeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const readFile = async (file: File) => {
    if (!file.name.endsWith(".md")) {
      setError("目前 MVP 只支持 Markdown 文件。");
      return;
    }
    setError("");
    onStart({ kind: "file", name: file.name, content: await file.text() });
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  };

  return (
    <main className="flex min-h-dvh bg-paper px-5 py-5 text-ink">
      <section className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium text-focus">LatentLearn</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-normal text-ink md:text-6xl">把追问长成一棵理解树</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            上传 Markdown 或输入一个主题，先获得系统梳理，再沿着每一次不确定继续挖。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition ${
              dragging ? "border-focus bg-mist" : "border-line bg-white"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} className="hidden" type="file" accept=".md,text/markdown" onChange={handleFileInput} />
            <div className="mb-5 grid size-12 place-items-center rounded-full border border-line text-xl">+</div>
            <p className="text-base font-medium">拖入 Markdown 文件</p>
            <p className="mt-2 text-sm text-muted">或点击选择本地 .md 文件</p>
          </div>

          <form
            className="flex min-h-64 flex-col rounded-lg border border-line bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (topic.trim()) onStart({ kind: "topic", topic });
            }}
          >
            <label className="text-sm font-medium text-muted" htmlFor="topic">
              直接输入主题
            </label>
            <textarea
              id="topic"
              data-testid="topic-input"
              className="mt-4 min-h-32 flex-1 resize-none rounded-md border border-line bg-paper p-4 text-lg outline-none focus:border-focus"
              placeholder="我想学 Transformer 的注意力机制"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && topic.trim()) {
                  event.preventDefault();
                  onStart({ kind: "topic", topic });
                }
              }}
            />
            <button
              data-testid="start-learning"
              className="mt-4 rounded-md bg-ink px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={busy || !topic.trim()}
            >
              开始学习
            </button>
          </form>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
