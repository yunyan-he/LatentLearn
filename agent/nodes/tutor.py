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
        response = llm.invoke(messages)
        content = response.content if hasattr(response, "content") else str(response)

        # 提取简短的总结 (document_summary) 用于偏题检测
        summary_messages = [
            SystemMessage(content=(
                "You are a precise summarization assistant. Summarize the following study content in 1-2 concise sentences (max 150 characters), "
                "highlighting only the main themes/topics so it can be used for downstream off-topic detection. Do not use conversational preamble."
                if language == "en" else
                "你是精准的摘要助手。请用1-2句极其精炼的话（不超过100字）总结以下学习内容，仅突出其最核心的学科主题和概念范围，"
                "用于后续关联度和偏题检测。不要说任何多余的开场白或解释。"
            )),
            HumanMessage(content=str(content))
        ]
        try:
            summary_response = llm.invoke(summary_messages, config={"tags": ["document_summary"]})
            summary_content = summary_response.content if hasattr(summary_response, "content") else str(summary_response)
            document_summary = str(summary_content).strip()
        except Exception:
            document_summary = document.get("title", "")

        return {"answer": str(content), "document_summary": document_summary}

    else:
        path = state.get("conversation_path", [])
        user_query = state["user_query"]
        anchor_text = state.get("anchor_text")
        doc_summary = state.get("document_summary")
        messages = [
            SystemMessage(content=system_prompt_tutor(language)),
            HumanMessage(
                content=build_followup_prompt(document, path, user_query, anchor_text, language, doc_summary)
            ),
        ]
        response = llm.invoke(messages)
        content = response.content if hasattr(response, "content") else str(response)
        return {"answer": str(content)}
