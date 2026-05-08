import { sectionTitles, selectRelevantDocumentContent } from "@/lib/document";
import type { BubbleNode, LearningDocument } from "@/lib/types";

export const getInitialOverviewPrompt = (language: "en" | "zh") => {
  if (language === "en") {
    return `You are a learning tutor. The user has uploaded the following document.
Please provide a clear, systematic explanation, structuring the core knowledge points.
Requirements: Structured, clear hierarchy, not excessively listed, maintain readability.
Do not use introductory phrases like "Sure, let's discuss", start directly.
Crucial: You MUST respond in English.`;
  }
  return `你是一个学习导师。用户上传了以下文档。
请给出一个清晰的系统性讲解，结构化呈现核心知识点。
要求：有层次感，但不要过度列表化，保持可读性。
不要说"好的，我来讲解"这类开场白，直接开始。
注意：请使用中文进行回答。`;
};

export const getFollowUpPrompt = (language: "en" | "zh") => {
  if (language === "en") {
    return `Current learning context: [Document content]
Learning path: [Q&A history from root to current node]
User is currently focused on: [Anchor text or current section]
User's query: [userQuery]

Please answer the user's question. If the question is not highly relevant to the current document,
answer normally, but at the very end append a paragraph starting with [OFFTOPIC] tag
to gently guide the user back to the current learning content (one sentence, polite and gentle, not forceful).
Crucial: You MUST respond in English.`;
  }
  return `当前学习上下文：[文档内容]
学习路径：[从根节点到当前节点的问答历史]
用户现在聚焦于：[锚点文字或当前章节]
用户的问题：[userQuery]

请回答用户的问题。如果这个问题与当前文档关系不大，
正常回答，但在最后用一段以 [OFFTOPIC] 标记的文字，
引导用户回到当前学习内容（一句话，轻柔，不强迫）。
注意：请使用中文进行回答。`;
};

export const getDecompositionPrompt = (language: "en" | "zh") => {
  if (language === "en") {
    return `User says: [Original input]
Current document structure: [Section title list]

You are LatentLearn's Question Planner. Your task is to analyze the user's long input, and extract macro-level, core independent points of confusion.
Note: Do NOT decompose too finely! Please use macro-level logical analysis, merge tiny issues, and extract an appropriate number (typically 2-3, maximum 4) of core big questions that are truly worth explaining independently.

Please determine if this input contains multiple independent and macro points of confusion. If so, output JSON:
{
  "decomposed": true,
  "summary": "One sentence describing how you macro-logically decompose this",
  "questions": [
    {
      "query": "Rewritten into a clear, independently answerable core question in English",
      "anchor": "The corresponding quoted text fragment or section name",
      "reason": "Why this point of confusion is worth explaining as a separate macro question",
      "order": 1
    }
  ]
}
If it is a single question or simple derivation, output:
{
  "decomposed": false,
  "summary": "This is a single question"
}

Requirements:
- Only output valid JSON, no Markdown formatting
- Do NOT over-decompose! Merge tiny/overlapping questions, limit to 2-4 core questions.
- Order should follow: Concept Clarification → Mechanism Explanation → Comparative Analysis → Applications & Boundaries
- If the user quoted text using \`>\` syntax, please do your best to keep or extract the precise quoted fragment in the "anchor" field. This is extremely important.
- query must be an English question sentence.`;
  }
  return `用户说：[原始输入]
当前文档结构：[章节标题列表]

你是 LatentLearn 的 Question Planner。你的任务是分析用户的长段输入，从中提取出宏观的、核心的独立疑惑点。
注意：不要过于细致地拆解！请使用宏观逻辑分析，合并细碎的问题，提取出合适数量（通常 2-3 个，最多不要超过 4 个）真正值得独立展开的核心大问题。

请判断这段输入是否包含多个独立且宏大的疑惑点。如果是，输出 JSON：
{
  "decomposed": true,
  "summary": "一句话说明你如何进行宏观逻辑拆解",
  "questions": [
    {
      "query": "改写成一个清晰、可独立回答的核心问题",
      "anchor": "原文引用的对应文本片段或章节名",
      "reason": "为什么这个疑惑值得作为一个宏观大点单独讲解",
      "order": 1
    }
  ]
}
如果是单一问题或者只是简单的衍生，输出：
{
  "decomposed": false,
  "summary": "这是一个单一问题"
}

要求：
- 只输出有效 JSON，不要 Markdown
- 不要过度拆解！合并细碎、重复的问题，控制在 2-4 个核心问题。
- 顺序遵循：概念澄清 → 机制解释 → 对比辨析 → 应用边界
- 如果用户通过 \`>\` 语法引用了多段文字，请在拆解时，尽量在 anchor 字段保留或提取对应的精确引用片段，这非常重要。
- query 必须是中文问题句`;
};


export function buildTreeWriterContext(
  nodes: BubbleNode[],
  questions: Array<{ id: string; query: string; anchor: string | null; reason?: string }>,
  currentNodeId: string | null,
  quoteRefs: Array<{ nodeId: string; text: string }>,
  language: "en" | "zh" = "en"
): string {
  const compactNodes = nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId,
    title: node.userQuery.slice(0, 160),
    resolved: node.resolved,
    anchorText: node.anchorText?.slice(0, 220) ?? null,
    answerSummary: node.aiResponse.replace(/\s+/g, " ").slice(0, 520)
  }));

  if (language === "en") {
    return `You are LatentLearn's Tree Writer Agent. Your job is to decide where each planned follow-up question should be mounted in the learning tree.

Rules:
- If a question is directly about a quote, mount it under the quote's source node.
- If a question combines multiple quoted nodes, mount it under their nearest shared conceptual parent when possible.
- If there are no quotes, semantically match the question to the most relevant existing node by title and answer summary.
- If the current node is resolved and the question is broad, prefer the nearest unresolved ancestor or the overview node.
- Use only parentId values from the provided node list.
- Output valid JSON only.

Output schema:
{
  "mounts": [
    { "questionId": "question id", "parentId": "node id", "strategy": "quote-source|lca|semantic-match|resolved-ancestor|current-focus|overview", "reason": "short reason" }
  ]
}

Current node id: ${currentNodeId ?? "null"}

Quote refs:
${JSON.stringify(quoteRefs, null, 2)}

Existing tree nodes:
${JSON.stringify(compactNodes, null, 2)}

Planned questions:
${JSON.stringify(questions, null, 2)}`;
  }

  return `你是 LatentLearn 的 Tree Writer Agent。你的任务是判断每个计划中的追问应该挂载到学习树的哪个节点下面。

规则：
- 如果问题直接追问某段划词引用，挂到该引用来源节点下。
- 如果问题综合了多个引用节点，尽量挂到它们共同的概念交汇父节点下。
- 如果没有引用，按问题语义与历史节点标题、回答摘要匹配，挂到最相关的节点下。
- 如果当前节点已理解且问题很宽泛，优先挂到最近的未理解祖先或总览节点。
- parentId 只能使用给定节点列表中的 id。
- 只输出有效 JSON。

输出格式：
{
  "mounts": [
    { "questionId": "问题 id", "parentId": "节点 id", "strategy": "quote-source|lca|semantic-match|resolved-ancestor|current-focus|overview", "reason": "简短理由" }
  ]
}

当前节点 id: ${currentNodeId ?? "null"}

引用来源：
${JSON.stringify(quoteRefs, null, 2)}

现有树节点：
${JSON.stringify(compactNodes, null, 2)}

计划问题：
${JSON.stringify(questions, null, 2)}`;
}

export function buildInitialPrompt(document: LearningDocument, language: "en" | "zh" = "en"): string {
  return `${getInitialOverviewPrompt(language)}

Document Title: ${document.title}
Document Structure:
${sectionTitles(document.structure)}

Document Content:
${selectRelevantDocumentContent(document.content)}`;
}

export function buildFollowUpContext(
  document: LearningDocument,
  path: BubbleNode[],
  userQuery: string,
  anchorText?: string,
  language: "en" | "zh" = "en"
): string {
  const retainedPath = trimPathForContext(path);
  const history = retainedPath
    .map((node, index) => {
      const label = language === "en" ? (index === 0 ? "Root Overview" : `Follow-up ${index}`) : (index === 0 ? "根节点" : `追问 ${index}`);
      return `${label}
User: ${node.userQuery}
Answer: ${node.aiResponse.slice(0, 1600)}`;
    })
    .join("\n\n");

  return `${getFollowUpPrompt(language)}

Current learning context:
${selectRelevantDocumentContent(document.content, anchorText)}

Learning path:
${history}

User is currently focused on:
${anchorText ?? path[path.length - 1]?.userQuery ?? document.title}

User's query:
${userQuery}`;
}

export function buildDecompositionContext(document: LearningDocument, query: string, language: "en" | "zh" = "en"): string {
  return `${getDecompositionPrompt(language)}

User says:
${query}

Current document structure:
${sectionTitles(document.structure)}`;
}

function trimPathForContext(path: BubbleNode[], maxNodes = 5): BubbleNode[] {
  if (path.length <= maxNodes) return path;
  const root = path[0];
  return [root, ...path.slice(-(maxNodes - 1))];
}
