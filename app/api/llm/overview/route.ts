import { streamInitialOverview } from "@/lib/llm-provider";
import type { LearningDocument } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { document, language } = (await request.json()) as { document: LearningDocument; language?: "en" | "zh" };
    return textStream(streamInitialOverview(document, language));
  } catch (error) {
    return errorResponse(error);
  }
}

function textStream(source: AsyncGenerator<string>) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of source) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    }
  );
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown LLM error.";
  return new Response(message, { status: 500 });
}
