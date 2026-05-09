"""
nodes/tree_writer.py — Tree Writer Agent Node

职责：
  - 根据当前学习树、Planner 拆出的问题、引用来源，决定每个问题挂载到哪个节点
  - 输出结构化 mounts，不生成面向用户的正文
"""

from __future__ import annotations

import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage

from agent.config import get_llm
from agent.prompts import build_tree_writer_prompt, system_prompt_decomposer
from agent.state import AgentState, TreeMountDecision

logger = logging.getLogger(__name__)


def tree_writer_node(state: AgentState) -> dict:
    language = state.get("language", "en")
    nodes = state.get("tree_nodes", [])
    questions = state.get("tree_questions", [])
    current_node_id = state.get("current_node_id")
    quote_refs = state.get("quote_refs", [])

    if not nodes or not questions:
        return {"tree_mounts": []}

    llm = get_llm()
    messages = [
        SystemMessage(content=system_prompt_decomposer(language)),
        HumanMessage(content=build_tree_writer_prompt(nodes, questions, current_node_id, quote_refs, language)),
    ]
    response = llm.invoke(messages)
    raw_content = response.content if hasattr(response, "content") else str(response)

    valid_node_ids = {node.get("id") for node in nodes}
    valid_question_ids = {question.get("id") for question in questions}
    parsed = _parse_mounts(str(raw_content), valid_node_ids, valid_question_ids)
    return {"tree_mounts": parsed}


def _parse_mounts(content: str, valid_node_ids: set[str | None], valid_question_ids: set[str | None]) -> list[TreeMountDecision]:
    cleaned = re.sub(r"^```json\s*", "", content.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.IGNORECASE)
    try:
        payload = json.loads(cleaned.strip())
    except json.JSONDecodeError:
        logger.warning("Failed to parse tree writer JSON output: %r", content[:500])
        return []

    mounts: list[TreeMountDecision] = []
    for mount in payload.get("mounts", []):
        question_id = mount.get("questionId")
        parent_id = mount.get("parentId")
        if question_id not in valid_question_ids or parent_id not in valid_node_ids:
            logger.warning("Discarded invalid tree mount: %r", mount)
            continue
        mounts.append(
            TreeMountDecision(
                questionId=question_id,
                parentId=parent_id,
                strategy=str(mount.get("strategy") or "semantic-match"),
                reason=str(mount.get("reason") or "Tree Writer selected this node."),
            )
        )
    return mounts
