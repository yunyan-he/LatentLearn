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

你是 LatentLearn 的 Question Planner。你的任务不是回答问题，而是诊断用户这段长输入里有哪些独立疑惑点，并整理成适合顺序学习的追问计划。

请判断这段输入是否包含多个独立疑惑点、问题、卡点或待解释句子。用户可能不会用问号，可能会写成一大段“我不理解……”。

如果是，输出 JSON：
{
  "decomposed": true,
  "summary": "一句话说明你如何拆解和排序",
  "questions": [
    {
      "query": "改写成一个清晰、可独立回答的问题",
      "anchor": "对应章节或null",
      "reason": "为什么这个疑惑值得单独讲",
      "order": 1
    }
  ]
}
如果是单一问题，输出：
{
  "decomposed": false,
  "summary": "这是一个单一问题"
}

要求：
- 只输出有效 JSON，不要 Markdown
- 最多拆成 6 个问题
- 合并重复问题
- 顺序遵循：概念澄清 → 机制解释 → 数学/实现细节 → 对比辨析 → 应用/边界
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
