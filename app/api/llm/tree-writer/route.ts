import { planTreeMounts } from "@/lib/llm-provider";
import type { BubbleNode, DecomposedQuestion, QuoteRef } from "@/lib/types";

export const runtime = "nodejs";

const AGENT_API_URL = process.env.AGENT_API_URL?.trim();

export async function POST(request: Request) {
  try {
    const { nodes, questions, currentNodeId, quoteRefs, language, threadId } = (await request.json()) as {
      nodes: BubbleNode[];
      questions: DecomposedQuestion[];
      currentNodeId: string | null;
      quoteRefs: QuoteRef[];
      language?: "en" | "zh";
      threadId?: string;
    };
    if (AGENT_API_URL) {
      const upstream = await fetch(`${AGENT_API_URL}/api/tree-writer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          nodes,
          questions,
          current_node_id: currentNodeId,
          quote_refs: quoteRefs ?? [],
          language: language ?? "en"
        })
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(`Agent error: ${upstream.status} ${detail.slice(0, 400)}`, { status: 502 });
      }
      return Response.json(await upstream.json());
    }

    const plan = await planTreeMounts(nodes, questions, currentNodeId, quoteRefs ?? [], language ?? "en");
    return Response.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Tree Writer error.";
    return new Response(message, { status: 500 });
  }
}
