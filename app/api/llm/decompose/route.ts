import { decomposeQuery } from "@/lib/llm-provider";
import type { LearningDocument } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { document, query, language } = (await request.json()) as {
      document: LearningDocument;
      query: string;
      language?: "en" | "zh";
    };
    const plan = await decomposeQuery(document, query, language);
    return Response.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error.";
    return new Response(message, { status: 500 });
  }
}
