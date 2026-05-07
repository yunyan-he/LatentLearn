"""
nodes/tutor.py — 答题 / 讲解 Agent Node

职责：
  - 根据 mode（overview / followup）构建 prompt
  - 调用 LLM（非流式，完整回答写入 state['answer']）
  - 流式输出由 FastAPI 层通过 graph.astream_events() 实现，
    此 node 只负责将最终完整文本写回 state

注意：
  LangGraph 的流式输出推荐方案是在 FastAPI 层使用 graph.astream_events()
  监听 "on_chat_model_stream" 事件，而不是在 node 内部管理流。
  这样 node 本身保持简洁，图的执行逻辑和 HTTP 响应解耦。
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from agent.config import get_llm
from agent.prompts import (
    build_followup_prompt,
    build_overview_prompt,
    system_prompt_tutor,
)
from agent.state import AgentState


def tutor_node(state: AgentState) -> dict:
    """LangGraph node：生成讲解 / 追问回答（完整文本，供非流式路径使用）"""
    document = state["document"]
    language = state.get("language", "en")
    mode = state.get("mode", "followup")

    llm = get_llm()

    if mode == "overview":
        messages = [
            SystemMessage(content=system_prompt_tutor(language)),
            HumanMessage(content=build_overview_prompt(document, language)),
        ]
    else:
        path = state.get("conversation_path", [])
        user_query = state["user_query"]
        anchor_text = state.get("anchor_text")
        messages = [
            SystemMessage(content=system_prompt_tutor(language)),
            HumanMessage(
                content=build_followup_prompt(document, path, user_query, anchor_text, language)
            ),
        ]

    response = llm.invoke(messages)
    content = response.content if hasattr(response, "content") else str(response)

    return {"answer": str(content)}
