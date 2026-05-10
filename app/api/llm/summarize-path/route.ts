import { summarizePath } from "@/lib/llm-provider";
import type { BubbleNode } from "@/lib/types";

export const runtime = "nodejs";

const AGENT_API_URL = process.env.AGENT_API_URL?.trim();

export async function POST(request: Request) {
  try {
    const { path, language, threadId } = (await request.json()) as {
      path: BubbleNode[];
      language?: "en" | "zh";
      threadId?: string;
    };

    if (AGENT_API_URL) {
      const upstream = await fetch(`${AGENT_API_URL}/api/summarize-path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          conversation_path: path,
          language: language ?? "en"
        })
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return new Response(`Agent error: ${upstream.status} ${detail.slice(0, 400)}`, { status: 502 });
      }
      return Response.json(await upstream.json());
    }

    return Response.json(await summarizePath(path, language ?? "en"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown memory summarizer error.";
    return new Response(message, { status: 500 });
  }
}
