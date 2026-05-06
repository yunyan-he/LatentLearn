import { decomposeQuery } from "@/lib/llm-provider";
import type { LearningDocument } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { document, query } = (await request.json()) as {
      document: LearningDocument;
      query: string;
    };
    const plan = await decomposeQuery(document, query);
    return Response.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error.";
    return new Response(message, { status: 500 });
  }
}
