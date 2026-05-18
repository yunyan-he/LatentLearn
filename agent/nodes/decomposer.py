"""
nodes/decomposer.py — 问题拆解 Agent Node

职责：
  - 接收 user_query 和文档结构
  - 调用 LLM 判断是否需要拆解成多个子问题
  - 将结果写入 state['decomposed_questions'] 和 state['needs_decomposition']
"""

from __future__ import annotations

import json
import logging
import re
import time

from langchain_core.messages import HumanMessage, SystemMessage

from agent.config import get_fast_llm
from agent.prompts import build_decomposition_prompt, system_prompt_decomposer
from agent.state import AgentState, DecomposedQuestion

logger = logging.getLogger(__name__)


def decomposer_node(state: AgentState) -> dict:
    """LangGraph node：问题拆解"""
    document = state["document"]
    query = state["user_query"]
    language = state.get("language", "en")

    llm = get_fast_llm()
    messages = [
        SystemMessage(content=system_prompt_decomposer(language)),
        HumanMessage(content=build_decomposition_prompt(document, query, language)),
    ]

    # 非流式调用，等待完整 JSON
    response = llm.invoke(messages)
    raw_content = response.content if hasattr(response, "content") else str(response)

    parsed = _parse_decomposition(str(raw_content))

    # 少于 2 个有效问题 → 不拆解，直接走 tutor
    if not parsed.get("decomposed") or len(parsed.get("questions", [])) < 2:
        return {
            "needs_decomposition": False,
            "decomposed_questions": [],
        }

    questions: list[DecomposedQuestion] = []
    for i, q in enumerate(parsed["questions"][:4]):  # 最多 4 个
        query_text = (q.get("query") or "").strip()
        if not query_text:
            continue
        questions.append(
            DecomposedQuestion(
                id=f"dq-{int(time.time() * 1000)}-{i}",
                query=query_text,
                anchor=q.get("anchor") if isinstance(q.get("anchor"), str) and q.get("anchor", "").strip() else None,
                reason=q.get("reason") if isinstance(q.get("reason"), str) else None,
                order=q.get("order", i + 1),
                selected=True,
            )
        )

    # 排序
    questions.sort(key=lambda x: x.get("order", 999) or 999)

    return {
        "needs_decomposition": len(questions) >= 2,
        "decomposed_questions": questions,
    }


def _parse_decomposition(content: str) -> dict:
    """清理 LLM 输出中可能混入的思考块和 Markdown fence，然后解析 JSON"""
    # 移除思考模块
    content = re.sub(r"<thought>.*?</thought>", "", content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE)

    cleaned = re.sub(r"^```json\s*", "", content.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.IGNORECASE)
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("Failed to parse decomposer JSON output: %r", content[:500])
        return {"decomposed": False, "summary": "", "questions": []}
