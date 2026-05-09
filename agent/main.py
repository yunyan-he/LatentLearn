"""
main.py — FastAPI 入口

接口：
  GET  /health              健康检查（含配置摘要）
  POST /api/overview        生成初始总览（SSE 流式）
  POST /api/followup        追问回答（SSE 流式）
  POST /api/decompose       问题拆解（非流式，返回 QuestionPlan JSON）

SSE 流式协议（与前端 streamFromApi 兼容）：
  data: {"type": "chunk", "content": "..."}
  data: {"type": "metadata", "is_off_topic": false, "off_topic_hint": null}
  data: [DONE]

thread_id：
  每个请求从请求体的 thread_id 字段读取（前端传 sessionId）
  作为 LangGraph config["configurable"]["thread_id"] 传入
"""

from __future__ import annotations

import json
import os
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent.config import get_settings
from agent.graph import graph
from agent.state import AgentState, BubbleNode, LearningDocument
from agent.utils.security import sanitize_text, sanitize_document, check_query_safety

# ─────────────────────────────────────────────────────────────────────────────
# App 初始化
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LatentLearn Agent API",
    description="LangGraph-based AI agent backend for LatentLearn",
    version="0.1.0",
)

cors_origins = os.environ.get("AGENT_CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response 模型
# ─────────────────────────────────────────────────────────────────────────────

class OverviewRequest(BaseModel):
    thread_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document: dict
    language: str = "en"


class FollowUpRequest(BaseModel):
    thread_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document: dict
    conversation_path: list[dict] = []
    user_query: str
    anchor_text: str | None = None
    language: str = "en"
    skip_decomposition: bool = False


class DecomposeRequest(BaseModel):
    thread_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document: dict
    query: str
    language: str = "en"


class TreeWriterRequest(BaseModel):
    thread_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nodes: list[dict]
    questions: list[dict]
    current_node_id: str | None = None
    quote_refs: list[dict] = []
    language: str = "en"


class SummarizePathRequest(BaseModel):
    thread_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_path: list[dict] = []
    language: str = "en"


# ─────────────────────────────────────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────────────────────────────────────

def _sse(data: str) -> str:
    return f"data: {data}\n\n"


def _make_config(thread_id: str) -> dict:
    """生成 LangGraph 调用配置，thread_id 作为 checkpointer key"""
    return {"configurable": {"thread_id": thread_id}}


async def _stream_graph_response(initial_state: AgentState, thread_id: str):
    """
    通过 graph.astream_events() 监听 LLM 流式 token，
    以 SSE 格式逐块推送给前端。
    最终发送 metadata 事件（is_off_topic 等），然后 [DONE]。
    """
    config = _make_config(thread_id)
    final_state: dict = {}

    async for event in graph.astream_events(initial_state, config=config, version="v2"):
        kind = event.get("event", "")

        # LLM 流式 token：只允许 tutor 节点的回答进入前端正文。
        # decomposer / tree-writer 等结构化 JSON 节点的 token 必须过滤掉，
        # 否则会把 {"decomposed": ...} 之类内容显示成回答。
        if kind == "on_chat_model_stream":
            metadata = event.get("metadata", {}) or {}
            node_name = metadata.get("langgraph_node")
            if node_name != "tutor":
                continue
            chunk = event.get("data", {}).get("chunk")
            if chunk and hasattr(chunk, "content") and chunk.content:
                yield _sse(json.dumps({"type": "chunk", "content": chunk.content}))

        # 图执行完毕，取最终 state
        elif kind == "on_chain_end" and event.get("name") == "LangGraph":
            output = event.get("data", {}).get("output", {})
            if isinstance(output, dict):
                final_state = output

    # 发送 metadata
    yield _sse(json.dumps({
        "type": "metadata",
        "is_off_topic": final_state.get("is_off_topic", False),
        "off_topic_hint": final_state.get("off_topic_hint"),
    }))
    yield _sse("[DONE]")


async def _stream_safety_warning(warning_text: str):
    """当触发输入安全拦截时，优雅返回 SSE 流，告知警告信息并不崩溃前端。"""
    yield _sse(json.dumps({"type": "chunk", "content": warning_text}))
    yield _sse(json.dumps({
        "type": "metadata",
        "is_off_topic": True,
        "off_topic_hint": "safety-alert",
    }))
    yield _sse("[DONE]")


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    settings = get_settings()
    return {"status": "ok", **settings}


@app.post("/api/overview")
async def overview(req: OverviewRequest):
    # 防御清洗文档，彻底剥离 HTML 注入和 XSS 脚本
    safe_doc = sanitize_document(req.document)

    initial_state = AgentState(
        thread_id=req.thread_id,
        document=safe_doc,  # type: ignore[arg-type]
        conversation_path=[],
        user_query="",
        anchor_text=None,
        language=req.language,  # type: ignore[arg-type]
        mode="overview",
        skip_decomposition=True,
        decomposed_questions=[],
        needs_decomposition=False,
        answer="",
        is_off_topic=False,
        off_topic_hint=None,
    )
    return StreamingResponse(
        _stream_graph_response(initial_state, req.thread_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/followup")
async def followup(req: FollowUpRequest):
    # 1. 净化用户提问及划词
    clean_query = sanitize_text(req.user_query)
    clean_anchor = sanitize_text(req.anchor_text)

    # 2. 检查输入安全合规性（长度、提示词注入、违规有毒内容）
    is_safe, warning_msg = check_query_safety(clean_query)
    if not is_safe and warning_msg:
        return StreamingResponse(
            _stream_safety_warning(warning_msg),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # 3. 防御清洗文档
    safe_doc = sanitize_document(req.document)

    initial_state = AgentState(
        thread_id=req.thread_id,
        document=safe_doc,  # type: ignore[arg-type]
        conversation_path=req.conversation_path,  # type: ignore[arg-type]
        user_query=clean_query or "",
        anchor_text=clean_anchor,
        language=req.language,  # type: ignore[arg-type]
        mode="followup",
        skip_decomposition=req.skip_decomposition,
        decomposed_questions=[],
        needs_decomposition=False,
        answer="",
        is_off_topic=False,
        off_topic_hint=None,
    )
    return StreamingResponse(
        _stream_graph_response(initial_state, req.thread_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/tree-writer")
async def tree_writer(req: TreeWriterRequest):
    initial_state = AgentState(
        thread_id=req.thread_id,
        document={"type": "topic", "title": "", "content": "", "structure": []},  # type: ignore[arg-type]
        conversation_path=[],
        user_query="",
        anchor_text=None,
        language=req.language,  # type: ignore[arg-type]
        mode="tree_writer",
        skip_decomposition=True,
        decomposed_questions=[],
        needs_decomposition=False,
        tree_nodes=req.nodes,  # type: ignore[typeddict-item]
        tree_questions=req.questions,  # type: ignore[typeddict-item]
        current_node_id=req.current_node_id,
        quote_refs=req.quote_refs,  # type: ignore[typeddict-item]
        tree_mounts=[],
        answer="",
        is_off_topic=False,
        off_topic_hint=None,
    )
    config = _make_config(req.thread_id)
    final_state = await graph.ainvoke(initial_state, config=config)
    return {"mounts": final_state.get("tree_mounts", [])}


@app.post("/api/decompose")
async def decompose(req: DecomposeRequest):
    """
    非流式：运行 decomposer node，返回 QuestionPlan JSON。
    与前端 decomposeQuery() 函数期望的格式完全兼容。
    """
    # 1. 净化提问并校验安全合规
    clean_query = sanitize_text(req.query)
    is_safe, warning_msg = check_query_safety(clean_query)
    if not is_safe and warning_msg:
        return {
            "summary": warning_msg,
            "questions": [],
        }

    # 2. 防御净化文档
    safe_doc = sanitize_document(req.document)

    initial_state = AgentState(
        thread_id=req.thread_id,
        document=safe_doc,  # type: ignore[arg-type]
        conversation_path=[],
        user_query=clean_query or "",
        anchor_text=None,
        language=req.language,  # type: ignore[arg-type]
        mode="decompose",
        skip_decomposition=False,
        decomposed_questions=[],
        needs_decomposition=False,
        answer="",
        is_off_topic=False,
        off_topic_hint=None,
    )

    config = _make_config(req.thread_id)
    final_state = await graph.ainvoke(initial_state, config=config)

    questions = final_state.get("decomposed_questions", [])
    needs = final_state.get("needs_decomposition", False)

    if not needs or len(questions) < 2:
        lang = req.language
        return {
            "summary": "This is a single question, better to answer directly." if lang == "en"
                       else "这是一个单一问题，直接回答更合适。",
            "questions": [],
        }

    return {
        "summary": (
            f"I identified {len(questions)} points of confusion to explain sequentially."
            if req.language == "en"
            else f"我识别到 {len(questions)} 个可以顺序讲解的疑惑点。"
        ),
        "questions": questions,
    }


@app.post("/api/summarize-path")
async def summarize_path_route(req: SummarizePathRequest):
    """
    定期对对话路径进行提取汇总，提供已掌握、未决问题和总结建议
    """
    from agent.nodes.memory_summarizer import summarize_path
    return await summarize_path(req.conversation_path, req.language) # type: ignore[arg-type]
