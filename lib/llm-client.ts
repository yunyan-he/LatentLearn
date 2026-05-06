import type { BubbleNode, LearningDocument, QuestionPlan } from "@/lib/types";

export async function* streamInitialOverview(document: LearningDocument): AsyncGenerator<string> {
  yield* streamFromApi("/api/llm/overview", { document });
}

export async function* streamFollowUp(
  document: LearningDocument,
  path: BubbleNode[],
  query: string,
  anchorText?: string
): AsyncGenerator<string> {
  yield* streamFromApi("/api/llm/follow-up", { document, path, query, anchorText });
}

export async function decomposeQuery(document: LearningDocument, query: string): Promise<QuestionPlan> {
  const response = await fetch("/api/llm/decompose", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ document, query })
  });

  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as QuestionPlan;
}

async function* streamFromApi(path: string, body: unknown): AsyncGenerator<string> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
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
