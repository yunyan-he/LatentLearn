import { sectionTitles, selectRelevantDocumentContent } from "@/lib/document";
import type { BubbleNode, LearningDocument } from "@/lib/types";

export const initialOverviewPrompt = `你是一个学习导师。用户上传了以下文档。
请给出一个清晰的系统性讲解，结构化呈现核心知识点。
要求：有层次感，但不要过度列表化，保持可读性。
不要说"好的，我来讲解"这类开场白，直接开始。`;

export const followUpPrompt = `当前学习上下文：[文档内容]
学习路径：[从根节点到当前节点的问答历史]
用户现在聚焦于：[锚点文字或当前章节]
用户的问题：[userQuery]

请回答用户的问题。如果这个问题与当前文档关系不大，
正常回答，但在最后用一段以 [OFFTOPIC] 标记的文字，
引导用户回到当前学习内容（一句话，轻柔，不强迫）。`;

export const decompositionPrompt = `用户说：[原始输入]
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

export function buildInitialPrompt(document: LearningDocument): string {
  return `${initialOverviewPrompt}

文档标题：${document.title}
文档结构：
${sectionTitles(document.structure)}

文档内容：
${selectRelevantDocumentContent(document.content)}`;
}

export function buildFollowUpContext(
  document: LearningDocument,
  path: BubbleNode[],
  userQuery: string,
  anchorText?: string
): string {
  const retainedPath = trimPathForContext(path);
  const history = retainedPath
    .map((node, index) => {
      const label = index === 0 ? "根节点" : `追问 ${index}`;
      return `${label}
用户：${node.userQuery}
回答：${node.aiResponse.slice(0, 1600)}`;
    })
    .join("\n\n");

  return `${followUpPrompt}

当前学习上下文：
${selectRelevantDocumentContent(document.content, anchorText)}

学习路径：
${history}

用户现在聚焦于：
${anchorText ?? path[path.length - 1]?.userQuery ?? document.title}

用户的问题：
${userQuery}`;
}

export function buildDecompositionContext(document: LearningDocument, query: string): string {
  return `${decompositionPrompt}

用户说：
${query}

当前文档结构：
${sectionTitles(document.structure)}`;
}

function trimPathForContext(path: BubbleNode[], maxNodes = 5): BubbleNode[] {
  if (path.length <= maxNodes) return path;
  const root = path[0];
  return [root, ...path.slice(-(maxNodes - 1))];
}
