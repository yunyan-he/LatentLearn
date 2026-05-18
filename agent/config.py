"""
config.py — 读取 AGENT_LLM_* 环境变量，初始化 LangChain ChatOpenAI 实例

支持的后端（通过修改 .env.agent 切换，代码无需改动）：
  - OpenRouter:      AGENT_LLM_BASE_URL=https://openrouter.ai/api/v1
  - 远程 GPU vLLM:   AGENT_LLM_BASE_URL=http://<server-ip>:8000/v1
  - 本地 Ollama:     AGENT_LLM_BASE_URL=http://localhost:11434/v1
  - DashScope Qwen:  AGENT_LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

LangSmith 可观测性：
  - 设置 LANGCHAIN_TRACING_V2=true 和 LANGSMITH_API_KEY 后，所有 LangGraph 调用
    的 trace 会自动上报到 https://smith.langchain.com
  - 不设置则完全不上报，对运行无任何影响
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# 加载 agent/.env.agent（同目录）
_env_path = Path(__file__).parent / ".env.agent"
load_dotenv(_env_path, override=False)  # override=False：不覆盖已有的 shell 环境变量


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}\n"
            f"Please set it in agent/.env.agent"
        )
    return value


def _optional(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@lru_cache(maxsize=1)
def get_llm() -> ChatOpenAI:
    """
    返回共享的 ChatOpenAI 实例（缓存，避免重复初始化）。
    langchain-openai 的 ChatOpenAI 原生支持 base_url 参数，
    可对接任何 OpenAI-compatible 接口。
    """
    api_key = _require("AGENT_LLM_API_KEY")
    base_url = _require("AGENT_LLM_BASE_URL")
    model = _require("AGENT_LLM_MODEL")
    temperature = float(_optional("AGENT_LLM_TEMPERATURE", "0.4"))
    max_tokens = int(_optional("AGENT_LLM_MAX_TOKENS", "2000"))

    # OpenRouter 需要额外的 attribution headers
    default_headers: dict[str, str] = {}
    http_referer = _optional("AGENT_LLM_HTTP_REFERER")
    app_title = _optional("AGENT_LLM_APP_TITLE")
    if http_referer:
        default_headers["HTTP-Referer"] = http_referer
    if app_title:
        default_headers["X-Title"] = app_title

    return ChatOpenAI(
        model=model,
        api_key=api_key,        # type: ignore[arg-type]
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        default_headers=default_headers or None,
        streaming=True,         # 默认开启，tutor node 会用 astream
    )


@lru_cache(maxsize=1)
def get_fast_llm() -> ChatOpenAI:
    """
    返回一个专门用于结构化/非辅导任务（拆解、定位、挂载、摘要）的极速 LLM 实例。
    默认自动检测并防止 Reasoning 延迟：
      - 优先检查 AGENT_LLM_FAST_MODEL 环境变量。
      - 如果未设置，则自动将 Gemini 类的慢模型退化为 'gemini-2.5-flash'（或 openrouter 下的 'google/gemini-2.5-flash'）。
      - 其他模型如果为 reasoning 型，也会智能降级到小尺寸高速模型以确保 0.5s 级响应。
    """
    api_key = _require("AGENT_LLM_API_KEY")
    base_url = _require("AGENT_LLM_BASE_URL")
    
    fast_model = os.environ.get("AGENT_LLM_FAST_MODEL", "").strip()
    if not fast_model:
        main_model = _require("AGENT_LLM_MODEL")
        if "thinking" in main_model or "pro" in main_model or "gemma-4" in main_model or "o1" in main_model or "o3" in main_model:
            if "openrouter" in base_url:
                fast_model = "google/gemini-2.5-flash"
            else:
                fast_model = "gemini-2.5-flash"
        else:
            fast_model = main_model

    temperature = float(_optional("AGENT_LLM_TEMPERATURE", "0.2"))
    max_tokens = int(_optional("AGENT_LLM_MAX_TOKENS", "1000"))

    default_headers: dict[str, str] = {}
    http_referer = _optional("AGENT_LLM_HTTP_REFERER")
    app_title = _optional("AGENT_LLM_APP_TITLE")
    if http_referer:
        default_headers["HTTP-Referer"] = http_referer
    if app_title:
        default_headers["X-Title"] = app_title

    return ChatOpenAI(
        model=fast_model,
        api_key=api_key,        # type: ignore[arg-type]
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        default_headers=default_headers or None,
        streaming=False,        # 结构化任务关闭流式，提高一次性吞吐
    )


def get_settings() -> dict:
    """返回当前配置摘要（用于 /health 接口展示，不含敏感 key）"""
    model = os.environ.get("AGENT_LLM_MODEL", "未配置")
    base_url = os.environ.get("AGENT_LLM_BASE_URL", "未配置")
    try:
        fast_llm = get_fast_llm()
        fast_model = fast_llm.model_name
    except Exception:
        fast_model = "检测失败"
    tracing = os.environ.get("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    project = os.environ.get("LANGSMITH_PROJECT", "")
    return {
        "model": model,
        "fast_model": fast_model,
        "base_url": base_url,
        "langsmith_tracing": tracing,
        "langsmith_project": project if tracing else None,
    }
