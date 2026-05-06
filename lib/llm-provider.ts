import type { BubbleNode, LearningDocument, QuestionPlan } from "@/lib/types";
import { buildDecompositionContext, buildFollowUpContext, buildInitialPrompt } from "@/lib/prompts";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatDelta {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

interface ChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export function getLlmModel() {
  const model = readRequiredEnv("LLM_MODEL");
  if (freeModelGuardEnabled() && !model.endsWith(":free")) {
    throw new Error(`LLM_MODEL "${model}" is not marked as free. Set LLM_MODEL to a :free model or set LLM_REQUIRE_FREE_MODEL=false.`);
  }
  return model;
}

export function hasLlmApiKey() {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

export function streamInitialOverview(document: LearningDocument) {
  return streamLlmProvider([
    {
      role: "system",
      content: "你是 LatentLearn 的学习导师。回答要清晰、准确、适合学习者继续追问。"
    },
    {
      role: "user",
      content: buildInitialPrompt(document)
    }
  ]);
}

export function streamFollowUp(document: LearningDocument, path: BubbleNode[], query: string, anchorText?: string) {
  return streamLlmProvider([
    {
      role: "system",
      content: "你是 LatentLearn 的学习导师。允许用户探索跑偏问题，但需要按提示词约定输出 [OFFTOPIC] 标记。"
    },
    {
      role: "user",
      content: buildFollowUpContext(document, path, query, anchorText)
    }
  ]);
}

export async function decomposeQuery(document: LearningDocument, query: string): Promise<QuestionPlan> {
  const content = await completeLlmProvider([
    {
      role: "system",
      content: "你只输出有效 JSON，不要 Markdown，不要解释。"
    },
    {
      role: "user",
      content: buildDecompositionContext(document, query)
    }
  ]);
  const parsed = parseDecomposition(content);
  if (!parsed.decomposed || parsed.questions.length < 2) {
    return {
      summary: parsed.summary || "这是一个单一问题，直接回答更合适。",
      questions: []
    };
  }

  return {
    summary: parsed.summary || `我识别到 ${parsed.questions.length} 个可以顺序讲解的疑惑点。`,
    questions: parsed.questions.slice(0, 6).map((question, index) => ({
      id: `dq-${Date.now()}-${index}`,
      query: question.query,
      anchor: question.anchor,
      reason: question.reason,
      order: question.order ?? index + 1,
      selected: true
    }))
  };
}

async function* streamLlmProvider(messages: ChatMessage[]): AsyncGenerator<string> {
  const response = await callLlmProvider(messages, true);
  if (!response.body) throw new Error("The LLM provider did not return a stream body.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const chunk = parseSseLine(line);
      if (chunk) yield chunk;
    }
  }

  const finalChunk = parseSseLine(buffer);
  if (finalChunk) yield finalChunk;
}

async function completeLlmProvider(messages: ChatMessage[]) {
  const response = await callLlmProvider(messages, false);
  const payload = (await response.json()) as ChatResponse;
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callLlmProvider(messages: ChatMessage[], stream: boolean) {
  const provider = readRequiredEnv("LLM_PROVIDER");
  const apiKey = readRequiredEnv("LLM_API_KEY");
  const baseUrl = readRequiredEnv("LLM_BASE_URL");
  const chatPath = readRequiredEnv("LLM_CHAT_COMPLETIONS_PATH");

  const response = await fetch(joinUrl(baseUrl, chatPath), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...optionalHeader("HTTP-Referer", process.env.LLM_HTTP_REFERER),
      ...optionalHeader("X-Title", process.env.LLM_APP_TITLE)
    },
    body: JSON.stringify({
      model: getLlmModel(),
      messages,
      stream,
      temperature: readNumberEnv("LLM_TEMPERATURE"),
      max_tokens: readIntegerEnv("LLM_MAX_TOKENS")
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${provider} request failed: ${response.status} ${detail.slice(0, 500)}`);
  }

  return response;
}

function parseSseLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return "";

  try {
    const parsed = JSON.parse(data) as ChatDelta;
    return parsed.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

function parseDecomposition(content: string): {
  decomposed: boolean;
  summary: string;
  questions: Array<{ query: string; anchor: string | null; reason?: string; order?: number }>;
} {
  let parsed: {
    decomposed?: boolean;
    summary?: string;
    questions?: Array<{ query?: string; anchor?: string | null; reason?: string; order?: number }>;
  };

  try {
    const jsonText = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    parsed = JSON.parse(jsonText) as {
      decomposed?: boolean;
      questions?: Array<{ query?: string; anchor?: string | null }>;
    };
  } catch {
    return {
      decomposed: false,
      summary: "",
      questions: []
    };
  }

  return {
    decomposed: Boolean(parsed.decomposed),
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    questions: (parsed.questions ?? [])
      .filter((question) => typeof question.query === "string" && question.query.trim())
      .map((question) => ({
        query: question.query!.trim(),
        anchor: typeof question.anchor === "string" && question.anchor.trim() ? question.anchor.trim() : null,
        reason: typeof question.reason === "string" && question.reason.trim() ? question.reason.trim() : undefined,
        order: typeof question.order === "number" && Number.isFinite(question.order) ? question.order : undefined
      }))
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
  };
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Please configure it in .env.local.`);
  return value;
}

function readNumberEnv(name: string) {
  const value = readRequiredEnv(name);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number.`);
  return parsed;
}

function readIntegerEnv(name: string) {
  const value = readRequiredEnv(name);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function freeModelGuardEnabled() {
  return process.env.LLM_REQUIRE_FREE_MODEL?.trim().toLowerCase() === "true";
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function optionalHeader(name: string, value?: string) {
  const trimmed = value?.trim();
  return trimmed ? { [name]: trimmed } : {};
}
