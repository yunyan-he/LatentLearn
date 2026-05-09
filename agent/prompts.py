"""
prompts.py — 所有 Prompt 模板（从 lib/prompts.ts 迁移，中英双语保留）

与 TS 版本保持语义一致，便于 A/B 对比和维护。
"""

from __future__ import annotations

import json

from agent.state import LearningDocument, BubbleNode


# ─────────────────────────────────────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────────────────────────────────────

def section_titles(structure: list[dict]) -> str:
    """将文档结构转为缩进的章节列表字符串"""
    lines = []
    for section in structure:
        indent = "  " * max(0, section.get("level", 1) - 1)
        lines.append(f"{indent}- {section.get('title', '')}")
    return "\n".join(lines) if lines else "(无章节结构)"


def select_relevant_content(content: str, anchor_text: str | None = None, max_chars: int = 3000) -> str:
    """
    选取与 anchor_text 最相关的内容片段，超出限制时截断。
    与 TS 版 selectRelevantDocumentContent 逻辑对齐。
    """
    if not anchor_text or anchor_text not in content:
        return content[:max_chars]

    idx = content.find(anchor_text)
    start = max(0, idx - 500)
    end = min(len(content), idx + len(anchor_text) + 2000)
    return content[start:end]


def trim_path_for_context(path: list[BubbleNode], max_nodes: int = 5) -> list[BubbleNode]:
    """保留根节点 + 最近 (max_nodes-1) 个节点，避免 context 超长"""
    if len(path) <= max_nodes:
        return path
    return [path[0], *path[-(max_nodes - 1):]]


# ─────────────────────────────────────────────────────────────────────────────
# System Prompts
# ─────────────────────────────────────────────────────────────────────────────

def system_prompt_tutor(language: str) -> str:
    if language == "en":
        return (
            "You are LatentLearn's learning tutor. Respond clearly, accurately, and in English "
            "so that learners can easily ask follow-up questions. Do not output JSON unless the user explicitly asks for JSON."
        )
    return (
        "你是 LatentLearn 的学习导师。回答要清晰、准确、适合学习者继续追问。不要输出 JSON，除非用户明确要求 JSON。"
    )


def system_prompt_decomposer(language: str) -> str:
    if language == "en":
        return "You only output valid JSON, no Markdown formatting, no extra explanation."
    return "你只输出有效 JSON，不要 Markdown，不要解释。"


def system_prompt_anchor_locator(language: str) -> str:
    if language == "en":
        return "You only output valid JSON, no Markdown formatting, no extra explanation."
    return "你只输出有效 JSON，不要 Markdown，不要解释。"



# ─────────────────────────────────────────────────────────────────────────────
# User Prompt 构建函数
# ─────────────────────────────────────────────────────────────────────────────


def build_tree_writer_prompt(
    nodes: list[BubbleNode],
    questions: list[dict],
    current_node_id: str | None,
    quote_refs: list[dict],
    language: str = "en",
) -> str:
    """Build prompt for Tree Writer Agent: choose mount parent for each planned question."""
    compact_nodes = []
    for node in nodes:
        compact_nodes.append({
            "id": node.get("id"),
            "parentId": node.get("parentId"),
            "title": str(node.get("userQuery", ""))[:160],
            "resolved": bool(node.get("resolved", False)),
            "anchorText": str(node.get("anchorText", ""))[:220] if node.get("anchorText") else None,
            "answerSummary": " ".join(str(node.get("aiResponse", "")).split())[:520],
        })

    if language == "en":
        return (
            "You are LatentLearn's Tree Writer Agent. Decide where each planned follow-up question should be mounted in the learning tree.\n\n"
            "Rules:\n"
            "- If a question is directly about a quote, mount it under the quote's source node.\n"
            "- If a question combines multiple quoted nodes, mount it under their nearest shared conceptual parent when possible.\n"
            "- If there are no quotes, semantically match the question to the most relevant existing node by title and answer summary.\n"
            "- If the current node is resolved and the question is broad, prefer the nearest unresolved ancestor or the overview node.\n"
            "- Use only parentId values from the provided node list.\n"
            "- Output valid JSON only.\n\n"
            "Output schema:\n"
            "{\n  \"mounts\": [\n    { \"questionId\": \"question id\", \"parentId\": \"node id\", \"strategy\": \"quote-source|lca|semantic-match|resolved-ancestor|current-focus|overview\", \"reason\": \"short reason\" }\n  ]\n}\n\n"
            f"Current node id: {current_node_id or 'null'}\n\n"
            f"Quote refs:\n{json.dumps(quote_refs, ensure_ascii=False, indent=2)}\n\n"
            f"Existing tree nodes:\n{json.dumps(compact_nodes, ensure_ascii=False, indent=2)}\n\n"
            f"Planned questions:\n{json.dumps(questions, ensure_ascii=False, indent=2)}"
        )

    return (
        "你是 LatentLearn 的 Tree Writer Agent。你的任务是判断每个计划中的追问应该挂载到学习树的哪个节点下面。\n\n"
        "规则：\n"
        "- 如果问题直接追问某段划词引用，挂到该引用来源节点下。\n"
        "- 如果问题综合了多个引用节点，尽量挂到它们共同的概念交汇父节点下。\n"
        "- 如果没有引用，按问题语义与历史节点标题、回答摘要匹配，挂到最相关的节点下。\n"
        "- 如果当前节点已理解且问题很宽泛，优先挂到最近的未理解祖先或总览节点。\n"
        "- parentId 只能使用给定节点列表中的 id。\n"
        "- 只输出有效 JSON。\n\n"
        "输出格式：\n"
        "{\n  \"mounts\": [\n    { \"questionId\": \"问题 id\", \"parentId\": \"节点 id\", \"strategy\": \"quote-source|lca|semantic-match|resolved-ancestor|current-focus|overview\", \"reason\": \"简短理由\" }\n  ]\n}\n\n"
        f"当前节点 id: {current_node_id or 'null'}\n\n"
        f"引用来源：\n{json.dumps(quote_refs, ensure_ascii=False, indent=2)}\n\n"
        f"现有树节点：\n{json.dumps(compact_nodes, ensure_ascii=False, indent=2)}\n\n"
        f"计划问题：\n{json.dumps(questions, ensure_ascii=False, indent=2)}"
    )


def build_overview_prompt(document: LearningDocument, language: str = "en") -> str:
    if language == "en":
        instruction = (
            "You are a learning tutor. The user has uploaded the following document.\n"
            "Please provide a clear, systematic explanation, structuring the core knowledge points.\n"
            "Requirements: Structured, clear hierarchy, not excessively listed, maintain readability.\n"
            "Do not use introductory phrases like \"Sure, let's discuss\", start directly.\n"
            "Crucial: You MUST respond in English."
        )
    else:
        instruction = (
            "你是一个学习导师。用户上传了以下文档。\n"
            "请给出一个清晰的系统性讲解，结构化呈现核心知识点。\n"
            "要求：有层次感，但不要过度列表化，保持可读性。\n"
            "不要说\"好的，我来讲解\"这类开场白，直接开始。\n"
            "注意：请使用中文进行回答。"
        )

    return (
        f"{instruction}\n\n"
        f"Document Title: {document['title']}\n"
        f"Document Structure:\n{section_titles(document.get('structure', []))}\n\n"
        f"Document Content:\n{select_relevant_content(document['content'])}"
    )


def build_followup_prompt(
    document: LearningDocument,
    path: list[BubbleNode],
    user_query: str,
    anchor_text: str | None = None,
    language: str = "en",
) -> str:
    retained = trim_path_for_context(path)
    history_parts = []
    for i, node in enumerate(retained):
        if language == "en":
            label = "Root Overview" if i == 0 else f"Follow-up {i}"
        else:
            label = "根节点" if i == 0 else f"追问 {i}"
        history_parts.append(
            f"{label}\nUser: {node['userQuery']}\nAnswer: {node['aiResponse'][:1600]}"
        )
    history = "\n\n".join(history_parts)

    if language == "en":
        instruction = (
            "Current learning context: [Document content]\n"
            "Learning path: [Q&A history from root to current node]\n"
            "User is currently focused on: [Anchor text or current section]\n"
            "User's query: [userQuery]\n\n"
            "Please answer the user's question in Markdown prose, not JSON. If and only if the question is clearly unrelated to the "
            "current document or learning path, answer normally, but at the very end append a paragraph starting "
            "with [OFFTOPIC] tag to gently guide the user back (one sentence, polite, not forceful).\n"
            "For related German grammar follow-ups, do not use [OFFTOPIC]. Crucial: You MUST respond in English."
        )
    else:
        instruction = (
            "当前学习上下文：[文档内容]\n"
            "学习路径：[从根节点到当前节点的问答历史]\n"
            "用户现在聚焦于：[锚点文字或当前章节]\n"
            "用户的问题：[userQuery]\n\n"
            "请用 Markdown 正文回答用户的问题，不要输出 JSON。如果且仅当问题明显与当前文档或学习路径无关，"
            "正常回答，但在最后用一段以 [OFFTOPIC] 标记的文字，"
            "引导用户回到当前学习内容（一句话，轻柔，不强迫）。\n"
            "如果是相关语法追问，不要使用 [OFFTOPIC]。注意：请使用中文进行回答。"
        )

    focus = anchor_text or (path[-1]["userQuery"] if path else document["title"])

    return (
        f"{instruction}\n\n"
        f"Current learning context:\n{select_relevant_content(document['content'], anchor_text)}\n\n"
        f"Learning path:\n{history}\n\n"
        f"User is currently focused on:\n{focus}\n\n"
        f"User's query:\n{user_query}"
    )


def build_decomposition_prompt(document: LearningDocument, query: str, language: str = "en") -> str:
    if language == "en":
        instruction = (
            'User says: [Original input]\n'
            'Current document structure: [Section title list]\n\n'
            "You are LatentLearn's Question Planner. Your task is to analyze the user's long input, "
            "and extract macro-level, core independent points of confusion.\n"
            "Note: Do NOT decompose too finely! Use macro-level logical analysis, merge tiny issues, "
            "and extract an appropriate number (typically 2-3, maximum 4) of core big questions "
            "that are truly worth explaining independently.\n\n"
            "Please determine if this input contains multiple independent and macro points of confusion. "
            "If so, output JSON:\n"
            '{\n'
            '  "decomposed": true,\n'
            '  "summary": "One sentence describing how you macro-logically decompose this",\n'
            '  "questions": [\n'
            '    {\n'
            '      "query": "Rewritten into a clear, independently answerable core question in English",\n'
            '      "anchor": "The corresponding quoted text fragment or section name",\n'
            '      "reason": "Why this point of confusion is worth explaining as a separate macro question",\n'
            '      "order": 1\n'
            '    }\n'
            '  ]\n'
            '}\n'
            'If it is a single question or simple derivation, output:\n'
            '{\n'
            '  "decomposed": false,\n'
            '  "summary": "This is a single question"\n'
            '}\n\n'
            "Requirements:\n"
            "- Only output valid JSON, no Markdown formatting\n"
            "- Do NOT over-decompose! Merge tiny/overlapping questions, limit to 2-4 core questions.\n"
            "- Order: Concept Clarification → Mechanism Explanation → Comparative Analysis → Applications & Boundaries\n"
            "- If the user quoted text using `>` syntax, preserve the precise quoted fragment in the \"anchor\" field.\n"
            "- query must be an English question sentence."
        )
    else:
        instruction = (
            '用户说：[原始输入]\n'
            '当前文档结构：[章节标题列表]\n\n'
            '你是 LatentLearn 的 Question Planner。你的任务是分析用户的长段输入，从中提取出宏观的、核心的独立疑惑点。\n'
            '注意：不要过于细致地拆解！请使用宏观逻辑分析，合并细碎的问题，提取出合适数量（通常 2-3 个，最多不要超过 4 个）真正值得独立展开的核心大问题。\n\n'
            '请判断这段输入是否包含多个独立且宏大的疑惑点。如果是，输出 JSON：\n'
            '{\n'
            '  "decomposed": true,\n'
            '  "summary": "一句话说明你如何进行宏观逻辑拆解",\n'
            '  "questions": [\n'
            '    {\n'
            '      "query": "改写成一个清晰、可独立回答的核心问题",\n'
            '      "anchor": "原文引用的对应文本片段或章节名",\n'
            '      "reason": "为什么这个疑惑值得作为一个宏观大点单独讲解",\n'
            '      "order": 1\n'
            '    }\n'
            '  ]\n'
            '}\n'
            '如果是单一问题或者只是简单的衍生，输出：\n'
            '{\n'
            '  "decomposed": false,\n'
            '  "summary": "这是一个单一问题"\n'
            '}\n\n'
            '要求：\n'
            '- 只输出有效 JSON，不要 Markdown\n'
            '- 不要过度拆解！合并细碎、重复的问题，控制在 2-4 个核心问题。\n'
            '- 顺序遵循：概念澄清 → 机制解释 → 对比辨析 → 应用边界\n'
            '- 如果用户通过 `>` 语法引用了多段文字，请在拆解时，尽量在 anchor 字段保留或提取对应的精确引用片段。\n'
            '- query 必须是中文问题句'
        )

    return (
        f"{instruction}\n\n"
        f"User says:\n{query}\n\n"
        f"Current document structure:\n{section_titles(document.get('structure', []))}"
    )


def build_anchor_locator_prompt(section_content: str, query: str, language: str = "en") -> str:
    if language == "en":
        return (
            f"You are a precise text anchor locator. Your task is to analyze the provided text section and find the most relevant, EXACT, continuous substring that relates to or directly answers the user's question.\n\n"
            f"Rules:\n"
            f"1. The 'anchor_text' MUST be an EXACT, case-sensitive continuous substring found inside the provided section content. Do not change punctuation, spelling, casing, or whitespaces. Do not paraphrase or summarize.\n"
            f"2. If no matching substring exists, or if the text section does not contain relevant content, return null for anchor_text.\n"
            f"3. Output ONLY a valid JSON object with the following schema, no Markdown formatting, no code fences:\n"
            f'{{\n  "anchor_text": "the exact matching substring or null",\n  "confidence": 0.0 to 1.0\n}}\n\n'
            f"Section Content:\n\"\"\"\n{section_content}\n\"\"\"\n\n"
            f"User Question:\n\"\"\"\n{query}\n\"\"\""
        )
    return (
        f"你是一个精准的文本锚点定位器。你的任务是在给定的章节正文中，找到最能回答或关联用户问题的一段**完全一致的、连续的原文子字符串**。\n\n"
        f"规则：\n"
        f"1. 提取的 'anchor_text' 必须是给定章节正文（Section Content）中的**完全一致、大小写敏感、连续的原始子字符串**。绝对不能做任何修改、润色、缩写或解释，必须完全一致。\n"
        f"2. 如果章节正文中没有任何相关的句子，或者没有相关原文，返回 null 作为 anchor_text。\n"
        f"3. 必须仅输出一个有效的 JSON 对象，不要 Markdown，不要任何解释或前后缀：\n"
        f'{{\n  "anchor_text": "完全一致的原文子字符串或 null",\n  "confidence": 0.0 到 1.0\n}}\n\n'
        f"章节正文 (Section Content):\n\"\"\"\n{section_content}\n\"\"\"\n\n"
        f"用户提问 (User Question):\n\"\"\"\n{query}\n\"\"\""
    )

