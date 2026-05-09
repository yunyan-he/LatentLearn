import type { BubbleNode, DecomposedQuestion, LearningDocument, QuoteRef, QuestionPlan, TreeMountPlan } from "@/lib/types";

export async function* streamInitialOverview(document: LearningDocument, options?: { signal?: AbortSignal; language?: "en" | "zh"; threadId?: string }): AsyncGenerator<string> {
  yield* streamFromApi("/api/llm/overview", { document, language: options?.language, threadId: options?.threadId }, options);
}

export async function* streamFollowUp(
  document: LearningDocument,
  path: BubbleNode[],
  query: string,
  anchorText?: string,
  options?: { signal?: AbortSignal; language?: "en" | "zh"; skipDecomposition?: boolean; threadId?: string }
): AsyncGenerator<string> {
  yield* streamFromApi("/api/llm/follow-up", {
    document,
    path,
    query,
    anchorText,
    language: options?.language,
    skipDecomposition: options?.skipDecomposition,
    threadId: options?.threadId
  }, options);
}

export async function decomposeQuery(document: LearningDocument, query: string, language?: "en" | "zh", threadId?: string): Promise<QuestionPlan> {
  const response = await fetch("/api/llm/decompose", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ document, query, language, threadId })
  });

  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as QuestionPlan;
}


export async function planTreeMounts(
  nodes: BubbleNode[],
  questions: DecomposedQuestion[],
  currentNodeId: string | null,
  quoteRefs: QuoteRef[],
  language?: "en" | "zh",
  threadId?: string
): Promise<TreeMountPlan> {
  const response = await fetch("/api/llm/tree-writer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ nodes, questions, currentNodeId, quoteRefs, language, threadId })
  });

  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as TreeMountPlan;
}

async function* streamFromApi(path: string, body: unknown, options?: { signal?: AbortSignal }): AsyncGenerator<string> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: options?.signal
  });

  if (!response.ok) throw new Error(await response.text());
  if (!response.body) throw new Error("The response did not include a stream body.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
