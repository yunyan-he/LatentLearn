import { decomposeQuery } from "@/lib/llm-provider";
import type { LearningDocument } from "@/lib/types";

export const runtime = "nodejs";

// ── Agent proxy (LangGraph backend) ─────────────────────────────────────────
const AGENT_API_URL = process.env.AGENT_API_URL?.trim();

export async function POST(request: Request) {
  try {
    const { document, query, language } = (await request.json()) as {
      document: LearningDocument;
      query: string;
      language?: "en" | "zh";
    };

    if (AGENT_API_URL) {
      // Agent /api/decompose returns JSON that is already QuestionPlan-compatible
      const upstream = await fetch(`${AGENT_API_URL}/api/decompose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, query, language: language ?? "en" }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(`Agent error: ${upstream.status} ${detail.slice(0, 400)}`, { status: 502 });
      }
      const plan = await upstream.json();
      return Response.json(plan);
    }

    const plan = await decomposeQuery(document, query, language);
    return Response.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error.";
    return new Response(message, { status: 500 });
  }
}
