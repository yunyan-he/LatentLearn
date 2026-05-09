"""
nodes/anchor_locator.py — 文本锚点和章节定位 Agent Node

职责：
  - 接收用户问题（或拆解后的子问题）与文档大纲结构
  - Stage 1: 本地分词/关键词权重匹配过滤，秒级定位最可能的小节 (Section)
  - Stage 2: 异步并发调用轻量级 LLM，从匹配小节正文中提取出 100% 精确的原文子串作为 anchor_text
  - 流式/并发场景：利用 asyncio.gather 对拆解后的所有子问题同时运行，总延迟限制在单次 LLM 调用内
"""

from __future__ import annotations

import asyncio
import json
import re

from langchain_core.messages import HumanMessage, SystemMessage

from agent.config import get_llm
from agent.prompts import build_anchor_locator_prompt, system_prompt_anchor_locator
from agent.state import AgentState, AnchorLocation, DecomposedQuestion, DocumentSection


def score_section(query: str, section: DocumentSection) -> float:
    """
    Stage 1: 本地极速分词权重打分，过滤定位最可能包含答案的 Section。
    """
    title = (section.get("title") or "").lower()
    content = (section.get("content") or "").lower()
    q = query.lower()

    # 提取分词，清洗标点
    q_words = set(re.findall(r"\w+", q))
    if not q_words:
        return 0.0

    title_words = set(re.findall(r"\w+", title))
    content_words = set(re.findall(r"\w+", content))

    # 1. 标题重合度赋予高权重
    title_overlap = len(q_words.intersection(title_words))
    # 2. 正文重合度
    content_overlap = len(q_words.intersection(content_words))

    # 3. 完整短语匹配奖励
    phrase_bonus = 0.0
    if q in content:
        phrase_bonus += 15.0
    if q in title:
        phrase_bonus += 30.0

    score = (title_overlap * 5.0) + content_overlap + phrase_bonus
    return score


async def extract_anchor_from_section(section: DocumentSection, query: str, language: str) -> dict:
    """
    Stage 2: 异步调用大模型，从选定的小节内容中提取出完全一致的原文子串。
    """
    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt_anchor_locator(language)),
        HumanMessage(content=build_anchor_locator_prompt(section["content"], query, language)),
    ]

    try:
        response = await llm.ainvoke(messages)
        raw_content = response.content if hasattr(response, "content") else str(response)
        parsed = _parse_anchor_json(str(raw_content))

        anchor_text = parsed.get("anchor_text")
        if anchor_text and isinstance(anchor_text, str) and anchor_text.strip():
            # 严格验证提取的划词是正文内容的子串（大小写敏感），防止模型编造
            if anchor_text in section["content"]:
                return {
                    "anchor_text": anchor_text,
                    "section_id": section["id"],
                    "confidence": float(parsed.get("confidence") or 0.8),
                }

        return {
            "anchor_text": None,
            "section_id": section["id"],
            "confidence": 0.0,
        }
    except Exception:
        # 网络异常或解析失败时，进行优雅降级
        return {
            "anchor_text": None,
            "section_id": section["id"],
            "confidence": 0.0,
        }


def _parse_anchor_json(content: str) -> dict:
    """清洗大模型输出并解析 JSON"""
    cleaned = re.sub(r"^```json\s*", "", content.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.IGNORECASE)
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        return {"anchor_text": None, "confidence": 0.0}


async def anchor_locator_node(state: AgentState) -> dict:
    """
    LangGraph Node: 文本锚点定位器。
    支持：
      - 对多步骤拆解出的子问题列表进行多线程/异步并发定位 (asyncio.gather)
      - 对单次提问进行单独定位，并将匹配的划词写回 state['anchor_text'] 供辅导导师使用
    """
    document = state.get("document")
    if not document or not document.get("structure"):
        return {}

    sections: list[DocumentSection] = document["structure"]
    language = state.get("language", "en")

    # ── 情况 A: Decomposer 拆解出了多个子问题 ──────────────────────────────────────
    if state.get("mode") == "decompose" or state.get("needs_decomposition", False):
        decomposed_questions = state.get("decomposed_questions", [])
        if not decomposed_questions:
            return {}

        tasks = []
        question_indices = []

        for idx, dq in enumerate(decomposed_questions):
            query_text = dq.get("query", "").strip()
            if not query_text:
                continue

            # Stage 1: 本地检索出最匹配的小节
            ranked = sorted(sections, key=lambda s: score_section(query_text, s), reverse=True)
            best_section = ranked[0] if ranked else None

            if best_section:
                # Stage 2: 加入并发任务池
                tasks.append(extract_anchor_from_section(best_section, query_text, language))
                question_indices.append((idx, best_section["id"]))

        if tasks:
            # 异步并发执行，总耗时仅等于单次 API 响应时间
            results = await asyncio.gather(*tasks)

            updated_questions = list(decomposed_questions)
            for (q_idx, section_id), res in zip(question_indices, results):
                anchor_text = res.get("anchor_text")
                if anchor_text:
                    updated_questions[q_idx]["anchor"] = anchor_text
                updated_questions[q_idx]["section_id"] = section_id

            return {"decomposed_questions": updated_questions}

    # ── 情况 B: 单一问题提问（正常追问模式） ──────────────────────────────────────────
    else:
        user_query = state.get("user_query", "").strip()
        if not user_query:
            return {}

        # Stage 1: 本地打分过滤
        ranked = sorted(sections, key=lambda s: score_section(user_query, s), reverse=True)
        best_section = ranked[0] if ranked else None

        if best_section:
            # Stage 2: 模型精确提取
            res = await extract_anchor_from_section(best_section, user_query, language)
            anchor_text = res.get("anchor_text")

            updates = {
                "located_anchor": AnchorLocation(
                    anchor_text=anchor_text,
                    section_id=res.get("section_id"),
                    confidence=res.get("confidence", 0.0),
                )
            }
            # 如果定位到了确凿的原文高亮，且用户之前没有手动高亮，更新它，让后续 tutor 节点知道
            if anchor_text and not state.get("anchor_text"):
                updates["anchor_text"] = anchor_text

            return updates

    return {}
