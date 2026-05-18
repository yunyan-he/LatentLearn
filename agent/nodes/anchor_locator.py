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
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from agent.config import get_llm
from agent.prompts import build_anchor_locator_prompt, system_prompt_anchor_locator
from agent.state import AgentState, AnchorLocation, DecomposedQuestion, DocumentSection

logger = logging.getLogger(__name__)
MAX_CANDIDATE_SECTIONS = 3


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


def normalize_and_find_substring(anchor_text: str, content: str) -> str | None:
    """
    对大模型输出的划词进行强健性清洗与子串恢复：
      1. 移除大模型可能误加的外层引号（如 "text" 或 'text'）
      2. 校验直接大小写敏感匹配
      3. 校验大小写不敏感匹配，并返回原文中的原始大小写版本
      4. 去除可能误加的末尾标点（. , ; ! ?）再次进行匹配
    """
    cleaned = anchor_text.strip()
    if len(cleaned) >= 2:
        if (cleaned[0] == '"' and cleaned[-1] == '"') or (cleaned[0] == "'" and cleaned[-1] == "'"):
            cleaned = cleaned[1:-1].strip()

    # 1. 完美大小写敏感匹配
    if cleaned in content:
        return cleaned

    # 2. 大小写不敏感匹配，找回并返回原文的真实大小写
    idx = content.lower().find(cleaned.lower())
    if idx != -1:
        return content[idx : idx + len(cleaned)]

    # 3. 剥离可能由 LLM 附带产生的末尾标点，再次尝试匹配
    trimmed = cleaned.rstrip(".,;!?\"'")
    if trimmed:
        if trimmed in content:
            return trimmed
        idx_trimmed = content.lower().find(trimmed.lower())
        if idx_trimmed != -1:
            return content[idx_trimmed : idx_trimmed + len(trimmed)]

    return None


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
            # 使用高强健性的子串匹配算法提取和校准原文
            matched_substring = normalize_and_find_substring(anchor_text, section["content"])
            if matched_substring:
                return {
                    "anchor_text": matched_substring,
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
    # 移除思考模块
    content = re.sub(r"<thought>.*?</thought>", "", content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE)

    cleaned = re.sub(r"^```json\s*", "", content.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.IGNORECASE)
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("Failed to parse anchor locator JSON output: %r", content[:500])
        return {"anchor_text": None, "confidence": 0.0}


def top_candidate_sections(query: str, sections: list[DocumentSection]) -> list[DocumentSection]:
    """Return a small ranked candidate set instead of betting all recall on top-1."""
    ranked = sorted(sections, key=lambda s: score_section(query, s), reverse=True)
    return ranked[:MAX_CANDIDATE_SECTIONS]


def best_anchor_result(results: list[dict]) -> dict | None:
    anchored = [res for res in results if res.get("anchor_text")]
    if anchored:
        return max(anchored, key=lambda res: float(res.get("confidence") or 0.0))
    return results[0] if results else None


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

            # Stage 1: 本地检索出最匹配的小节候选
            candidates = top_candidate_sections(query_text, sections)
            if candidates:
                # Stage 2: 每个问题并发尝试 top candidates，降低召回错位概率
                tasks.append(_extract_best_anchor(candidates, query_text, language))
                question_indices.append(idx)

        if tasks:
            # 异步并发执行，总耗时仅等于单次 API 响应时间
            results = await asyncio.gather(*tasks)

            updated_questions = list(decomposed_questions)
            for q_idx, res in zip(question_indices, results):
                anchor_text = res.get("anchor_text")
                if anchor_text:
                    updated_questions[q_idx]["anchor"] = anchor_text
                if res.get("section_id"):
                    updated_questions[q_idx]["section_id"] = res["section_id"]

            return {"decomposed_questions": updated_questions}

    # ── 情况 B: 单一问题提问（正常追问模式） ──────────────────────────────────────────
    else:
        # 1. 黄金先验快捷路径：如果用户已经手动进行了划词高亮 (state.get("anchor_text") 存在)
        # 我们直接在本地扫描所有 Section 寻找匹配项，实现 0 毫秒高保真对焦，完全不调用大模型！
        manual_anchor = state.get("anchor_text")
        if manual_anchor and isinstance(manual_anchor, str) and manual_anchor.strip():
            # 兼容单个或多个 "引用 X: " 或 "Quote X: " 格式的前端拼接数据，提取出纯净的原文进行扫描
            quotes = [q.strip() for q in re.split(r"(?:引用|Quote) \d+:\s*", manual_anchor.strip()) if q.strip()]
            target_phrase = quotes[0] if quotes else manual_anchor.strip()

            for sec in sections:
                # A. 严格大小写匹配
                if target_phrase in sec["content"]:
                    return {
                        "located_anchor": AnchorLocation(
                            anchor_text=target_phrase,
                            section_id=sec["id"],
                            confidence=1.0,  # 用户手动指认，置信度直接设为 1.0 (100% 确信)
                        )
                    }
                # B. 大小写不敏感匹配（并自动纠正为原文的真实大小写）
                idx = sec["content"].lower().find(target_phrase.lower())
                if idx != -1:
                    actual_text = sec["content"][idx : idx + len(target_phrase)]
                    return {
                        "located_anchor": AnchorLocation(
                            anchor_text=actual_text,
                            section_id=sec["id"],
                            confidence=1.0,
                        ),
                        "anchor_text": actual_text,  # 纠正为原文的真实大小写
                    }

        # 2. 正常路径：如果用户没有提供任何手动划词，才调用 AI 定位器进行智能检索和抽取
        user_query = state.get("user_query", "").strip()
        if not user_query:
            return {}

        # Stage 1: 本地打分过滤
        candidates = top_candidate_sections(user_query, sections)

        if candidates:
            # Stage 2: 模型精确提取
            res = await _extract_best_anchor(candidates, user_query, language)
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


async def _extract_best_anchor(sections: list[DocumentSection], query: str, language: str) -> dict:
    results = await asyncio.gather(
        *(extract_anchor_from_section(section, query, language) for section in sections)
    )
    return best_anchor_result(results) or {
        "anchor_text": None,
        "section_id": sections[0]["id"] if sections else None,
        "confidence": 0.0,
    }
