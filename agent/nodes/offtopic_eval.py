"""
nodes/offtopic_eval.py — 话题相关性评估 Node

职责：
  - 检测 tutor 的 answer 中是否包含 [OFFTOPIC] 标记
  - 拆分出正文和 off-topic hint
  - 将清洗后的结果回写到 state
"""

from __future__ import annotations

import re

from agent.state import AgentState


_OFFTOPIC_PATTERN = re.compile(r"\[OFFTOPIC\](.*?)$", re.DOTALL | re.IGNORECASE)


def offtopic_eval_node(state: AgentState) -> dict:
    """LangGraph node：Off-topic 标记检测与拆分"""
    raw_answer = state.get("answer", "")

    match = _OFFTOPIC_PATTERN.search(raw_answer)
    if match:
        hint_text = match.group(1).strip()
        clean_answer = raw_answer[: match.start()].strip()
        return {
            "answer": clean_answer,
            "is_off_topic": True,
            "off_topic_hint": hint_text if hint_text else None,
        }

    return {
        "answer": raw_answer.strip(),
        "is_off_topic": False,
        "off_topic_hint": None,
    }
