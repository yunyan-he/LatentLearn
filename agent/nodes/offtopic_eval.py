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
    """LangGraph node：Off-topic 标记检测与拆分（含父节点继承逻辑）"""
    raw_answer = state.get("answer", "")
    language = state.get("language", "en")

    # 1. 优先提取当前回答中可能存在的 [OFFTOPIC] 标记
    match = _OFFTOPIC_PATTERN.search(raw_answer)
    has_current_offtopic = bool(match)
    
    hint_text = None
    clean_answer = raw_answer
    
    if match:
        hint_text = match.group(1).strip()
        clean_answer = raw_answer[: match.start()].strip()

    # 2. 继承检测：如果对话路径的最后一个节点（即父节点）是离题的，则子节点自动继承
    is_parent_off_topic = False
    path = state.get("conversation_path", [])
    if path:
        parent = path[-1]
        is_parent_off_topic = bool(parent.get("isOffTopic") or parent.get("is_off_topic", False))

    if has_current_offtopic or is_parent_off_topic:
        if not hint_text:
            if language == "en":
                hint_text = "To return to the core study path, select an on-topic node from the tree or click the button below."
            else:
                hint_text = "要回到原学习主线，请点击右侧树中的其他节点，或点击下方按钮回到主线。"
        
        return {
            "answer": clean_answer.strip(),
            "is_off_topic": True,
            "off_topic_hint": hint_text,
        }

    return {
        "answer": raw_answer.strip(),
        "is_off_topic": False,
        "off_topic_hint": None,
    }
