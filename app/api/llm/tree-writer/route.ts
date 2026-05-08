import { planTreeMounts } from "@/lib/llm-provider";
import type { BubbleNode, DecomposedQuestion, QuoteRef } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { nodes, questions, currentNodeId, quoteRefs, language } = (await request.json()) as {
      nodes: BubbleNode[];
      questions: DecomposedQuestion[];
      currentNodeId: string | null;
      quoteRefs: QuoteRef[];
      language?: "en" | "zh";
    };
    const plan = await planTreeMounts(nodes, questions, currentNodeId, quoteRefs ?? [], language ?? "en");
    return Response.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Tree Writer error.";
    return new Response(message, { status: 500 });
  }
}
