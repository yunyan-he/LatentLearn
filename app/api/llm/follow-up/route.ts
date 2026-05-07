import { streamFollowUp } from "@/lib/llm-provider";
import type { BubbleNode, LearningDocument } from "@/lib/types";

export const runtime = "nodejs";

// ── Agent proxy (LangGraph backend) ─────────────────────────────────────────
const AGENT_API_URL = process.env.AGENT_API_URL?.trim();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      document: LearningDocument;
      path: BubbleNode[];
      query: string;
      anchorText?: string;
      language?: "en" | "zh";
    };

    if (AGENT_API_URL) {
      // Map TS field names → agent API field names
      return proxyToAgent(`${AGENT_API_URL}/api/followup`, {
        document: body.document,
        conversation_path: body.path,
        user_query: body.query,
        anchor_text: body.anchorText ?? null,
        language: body.language ?? "en",
      });
    }

    return textStream(streamFollowUp(body.document, body.path, body.query, body.anchorText, body.language));
  } catch (error) {
    return errorResponse(error);
  }
}

// ── Proxy helper (shared logic, identical to overview/route.ts) ──────────────

async function proxyToAgent(url: string, body: unknown) {
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    return new Response(`Agent error: ${upstream.status} ${detail.slice(0, 400)}`, { status: 502 });
  }
  if (!upstream.body) {
    return new Response("Agent returned no stream body", { status: 502 });
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data) as { type: string; content?: string };
                if (parsed.type === "chunk" && parsed.content) {
                  controller.enqueue(encoder.encode(parsed.content));
                }
              } catch {
                // non-JSON SSE line, skip
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    }
  );
}

// ── Original direct-LLM path (fallback) ─────────────────────────────────────

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
