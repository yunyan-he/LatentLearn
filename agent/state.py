"""
AgentState — LangGraph 状态机的全局状态定义

设计说明：
- thread_id 已预留，当前前端每次请求传入全量 conversation_path（无状态模式）
- 未来若要接入 PostgreSQL/Redis Checkpointer，只需在 graph.compile() 处
  传入 checkpointer 参数，前端和 FastAPI 路由无需改动
"""

from __future__ import annotations

from typing import Literal
from typing_extensions import TypedDict


class DocumentSection(TypedDict):
    id: str
    title: str
    level: int
    content: str


class LearningDocument(TypedDict):
    type: Literal["file", "topic"]
    title: str
    content: str
    structure: list[DocumentSection]


class BubbleNode(TypedDict):
    id: str
    parentId: str | None
    userQuery: str
    aiResponse: str


class DecomposedQuestion(TypedDict):
    id: str
    query: str
    anchor: str | None
    reason: str | None
    order: int
    selected: bool


class AgentState(TypedDict):
    # ── 请求标识 ──────────────────────────────────────────────────────────────
    # 预留 thread_id：目前前端每次传全量 context（无状态）
    # 未来接入 Checkpointer 时，后端可用此 ID 检索历史，前端无需任何改动
    thread_id: str  # UUID，由前端（sessionId）生成并随每次请求传入

    # ── 输入 ──────────────────────────────────────────────────────────────────
    document: LearningDocument
    conversation_path: list[BubbleNode]  # 从根到当前节点的气泡路径（含完整 aiResponse）
    user_query: str
    anchor_text: str | None
    language: Literal["en", "zh"]
    mode: Literal["overview", "followup", "decompose"]

    # ── 中间产物 ───────────────────────────────────────────────────────────────
    decomposed_questions: list[DecomposedQuestion]  # decomposer 产出
    needs_decomposition: bool                        # router 判断：是否需要拆解

    # ── 最终输出 ───────────────────────────────────────────────────────────────
    answer: str           # 完整回答文本（流式场景下由 tutor node 构建）
    is_off_topic: bool
    off_topic_hint: str | None
