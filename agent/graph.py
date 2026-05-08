"""
graph.py — LangGraph 状态机组装

图结构：

    [START]
       │
  intent_router
       │
  ┌────┴────────────────┐
  │ mode==overview       │ mode==followup/decompose
  ▼                     ▼
tutor              decomposer
  │                     │
  │         ┌───────────┴────────────┐
  │         │ needs_decomposition?    │
  │         └────────────────────────┘
  │           Yes ↓           No ↓
  │         [END: 返回        tutor
  │          decompose         │
  │          plan给前端]       │
  │                            │
  └────────────────────────────┤
                               ▼
                         offtopic_eval
                               │
                            [END]

thread_id 说明：
  - 当前作为 config["configurable"]["thread_id"] 传入 graph.invoke()
  - 图使用 MemorySaver（内存，进程内 session 级别的 checkpointing）
  - 未来替换为 PostgresSaver / RedisSaver 时，只需更改 checkpointer，其余不变
"""

from __future__ import annotations

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from agent.nodes.decomposer import decomposer_node
from agent.nodes.offtopic_eval import offtopic_eval_node
from agent.nodes.tutor import tutor_node
from agent.state import AgentState


# ─────────────────────────────────────────────────────────────────────────────
# Router functions（条件边）
# ─────────────────────────────────────────────────────────────────────────────

def route_after_intent(state: AgentState) -> str:
    """intent_router 后的路由：overview 直接到 tutor，其余先经 decomposer"""
    mode = state.get("mode", "followup")
    if mode == "overview":
        return "tutor"
    return "decomposer"


def route_after_decomposer(state: AgentState) -> str:
    """decomposer 后的路由：需要拆解 → END（由 FastAPI 返回 plan），否则继续 tutor"""
    if state.get("needs_decomposition", False):
        return END
    return "tutor"


def route_after_tutor(state: AgentState) -> str:
    """overview 不需要跑偏检测；followup 才解析 [OFFTOPIC] 控制标记。"""
    if state.get("mode") == "overview":
        return END
    return "offtopic_eval"


# ─────────────────────────────────────────────────────────────────────────────
# Intent Router Node（轻量，仅做 mode 校验，不调用 LLM）
# ─────────────────────────────────────────────────────────────────────────────

def intent_router_node(state: AgentState) -> dict:
    """校验并规范化 mode 字段，无需 LLM 调用"""
    mode = state.get("mode", "followup")
    if mode not in ("overview", "followup", "decompose"):
        mode = "followup"
    return {"mode": mode}


# ─────────────────────────────────────────────────────────────────────────────
# 图的构建与编译
# ─────────────────────────────────────────────────────────────────────────────

def build_graph():
    """构建并返回编译好的 LangGraph 图（使用 MemorySaver 作为临时 Checkpointer）"""
    builder = StateGraph(AgentState)

    # 注册 Nodes
    builder.add_node("intent_router", intent_router_node)
    builder.add_node("decomposer", decomposer_node)
    builder.add_node("tutor", tutor_node)
    builder.add_node("offtopic_eval", offtopic_eval_node)

    # 入口
    builder.add_edge(START, "intent_router")

    # intent_router → tutor（overview）或 decomposer（followup/decompose）
    builder.add_conditional_edges(
        "intent_router",
        route_after_intent,
        {"tutor": "tutor", "decomposer": "decomposer"},
    )

    # decomposer → END（需拆解，返回 plan）或 tutor（单一问题继续）
    builder.add_conditional_edges(
        "decomposer",
        route_after_decomposer,
        {END: END, "tutor": "tutor"},
    )

    # tutor → overview 直接结束；followup 再进入 off-topic 控制标记解析
    builder.add_conditional_edges(
        "tutor",
        route_after_tutor,
        {END: END, "offtopic_eval": "offtopic_eval"},
    )

    # offtopic_eval → END
    builder.add_edge("offtopic_eval", END)

    # MemorySaver：进程内 checkpointing，用于 thread_id 隔离。
    # 未来换成 PostgresSaver 只需改这一行：
    #   from langgraph.checkpoint.postgres import PostgresSaver
    #   checkpointer = PostgresSaver(conn_string=os.environ["DATABASE_URL"])
    checkpointer = MemorySaver()

    return builder.compile(checkpointer=checkpointer)


# 模块级单例，避免每次请求重新编译
graph = build_graph()
