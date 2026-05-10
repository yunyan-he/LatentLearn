"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-semibold leading-8 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold leading-7 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold leading-7 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-3 leading-8">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-2 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-focus bg-mist px-4 py-2 text-muted">{children}</blockquote>,
  code: ({ children, className }) => {
    const inline = !className;
    if (inline) {
      return <code className="rounded bg-paper px-1.5 py-0.5 text-[0.92em] text-focus">{children}</code>;
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-md border border-line bg-ink p-4 text-sm leading-6 text-white [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-6 border-line" />,
  a: ({ children, href }) => (
    <a className="text-focus underline underline-offset-4" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line bg-paper px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top">{children}</td>
};

function preprocessMarkdownMath(content: string): string {
  if (!content) return "";
  return content
    // 将单独占一行的单美元符号 $ 替换为双美元符号 $$，防止其被误判为普通文本与多行行内公式
    .replace(/(?:^|\n)\s*\$\s*(?:\n|$)/g, "\n$$\n")
    .replace(/\\\[/g, "\n$$\n")
    .replace(/\\\]/g, "\n$$\n")
    .replace(/\\\(/g, " $ ")
    .replace(/\\\)/g, " $ ");
}

export function MarkdownAnswer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={markdownComponents}
    >
      {preprocessMarkdownMath(content)}
    </ReactMarkdown>
  );
}
