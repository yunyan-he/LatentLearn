import { buildDecompositionContext, buildFollowUpContext, buildInitialPrompt } from "@/lib/prompts";
import type { BubbleNode, DecomposedQuestion, LearningDocument } from "@/lib/types";

const offTopicHints = ["天气", "股票", "做饭", "旅行", "电影", "八卦", "游戏", "健身"];

export async function* streamInitialOverview(document: LearningDocument): AsyncGenerator<string> {
  void buildInitialPrompt(document);
  const sections = document.structure.slice(0, 6);
  const body =
    document.type === "topic"
      ? topicOverview(document.title)
      : [
          `# ${document.title}`,
          "",
          "这份材料可以先从整体问题意识、核心概念和章节之间的递进关系三层来理解。",
          "",
          ...sections.flatMap((section, index) => [
            `## ${index + 1}. ${section.title}`,
            summarizeSection(section.content, section.title)
          ]),
          "",
          "学习时可以先抓住主线，再沿着不确定的句子继续追问。每一次追问都会成为右侧理解树上的一个节点，方便你随时回到来时的路。"
        ].join("\n");

  yield* streamText(body);
}

export async function* streamFollowUp(
  document: LearningDocument,
  path: BubbleNode[],
  query: string,
  anchorText?: string
): AsyncGenerator<string> {
  void buildFollowUpContext(document, path, query, anchorText);
  const isOffTopic = detectOffTopic(document, query);
  const focus = anchorText ? `你选中的这段「${anchorText.slice(0, 80)}」` : `当前焦点「${path[path.length - 1]?.userQuery ?? document.title}」`;
  const answer = [
    `围绕${focus}，可以这样拆开看：`,
    "",
    `第一步，先把问题里的关键词放回当前学习材料。这里真正要分辨的是“它在解决什么问题”，而不是只记住一个定义。`,
    "",
    `第二步，看它和上一层内容的关系。上一层给了背景，这个问题更像是在追问其中一个局部机制：${query.replace(/^>\s?.*\n\n/, "").trim()}`,
    "",
    "第三步，用自己的话复述：如果你能说清楚它为什么出现、依赖哪些前提、会导致什么结果，这个点就基本被你拿住了。",
    "",
    anchorText ? `针对原文锚点，我建议把注意力放在「${anchorText.slice(0, 120)}」里的因果词、转折词或限定词上，它们通常决定了这句话的学习价值。` : "如果还觉得模糊，可以继续选中回答里的某一句追问，我会把新问题接到这个节点下面。",
    isOffTopic ? `\n\n[OFFTOPIC] 这个问题可以先探索完；要回到「${document.title}」时，从右侧树点回上一条主线即可。` : ""
  ].join("\n");

  yield* streamText(answer);
}

export async function decomposeQuery(document: LearningDocument, query: string): Promise<DecomposedQuestion[]> {
  void buildDecompositionContext(document, query);
  const normalized = query.replace(/^>\s?.*\n\n/, "").trim();
  const parts = normalized
    .split(/(?:\n+|[？?；;]|(?:\s+和\s+)|(?:\s+以及\s+)|(?:\s+还有\s+))/)
    .map((part) => part.trim())
    .filter((part) => part.length > 5);

  if (parts.length < 2) return [];

  return parts.slice(0, 5).map((part, index) => ({
    id: `dq-${Date.now()}-${index}`,
    query: part.endsWith("？") || part.endsWith("?") ? part : `${part}？`,
    anchor: matchSection(document, part),
    selected: true
  }));
}

export function parseOffTopic(raw: string): { answer: string; isOffTopic: boolean; hint?: string } {
  const marker = "[OFFTOPIC]";
  const index = raw.indexOf(marker);
  if (index < 0) return { answer: raw.trim(), isOffTopic: false };
  return {
    answer: raw.slice(0, index).trim(),
    isOffTopic: true,
    hint: raw.slice(index + marker.length).trim()
  };
}

async function* streamText(text: string): AsyncGenerator<string> {
  const tokens = text.match(/[\s\S]{1,22}/g) ?? [];
  for (const token of tokens) {
    await new Promise((resolve) => setTimeout(resolve, 12));
    yield token;
  }
}

function topicOverview(topic: string): string {
  return [
    `# ${topic}`,
    "",
    "可以先搭一个三层框架：它是什么、为什么重要、怎样判断自己真的理解了。",
    "",
    "## 核心概念",
    `先给「${topic}」一个可操作的定义，再区分它容易混淆的邻近概念。学习早期不要急着背细节，先确定边界。`,
    "",
    "## 结构主线",
    "把主题拆成背景、机制、例子和应用四块。背景回答它从哪里来，机制回答它如何运作，例子负责校准直觉，应用负责检验迁移能力。",
    "",
    "## 追问路线",
    "接下来最值得追问的是：哪个概念最像黑箱？哪一步推导让你不踏实？哪个例子和定义对不上？这些问题会自然长成右侧的理解树。"
  ].join("\n");
}

function summarizeSection(content: string, title: string): string {
  const compact = content.replace(/[#>*_\-\[\]()`]/g, "").replace(/\s+/g, " ").trim();
  if (!compact) return `这一节是「${title}」的结构位置，适合作为后续追问的锚点。`;
  return `${compact.slice(0, 180)}${compact.length > 180 ? "..." : ""}`;
}

function detectOffTopic(document: LearningDocument, query: string): boolean {
  const text = query.toLowerCase();
  const titleTokens = document.title.toLowerCase().split(/\s+/).filter(Boolean);
  const hasTitleOverlap = titleTokens.some((token) => token.length > 1 && text.includes(token));
  const hasOffTopicSignal = offTopicHints.some((hint) => query.includes(hint));
  return hasOffTopicSignal && !hasTitleOverlap;
}

function matchSection(document: LearningDocument, query: string): string | null {
  const section = document.structure.find((item) => query.includes(item.title));
  return section?.title ?? null;
}
