"""
config.py — 读取 AGENT_LLM_* 环境变量，初始化 LangChain ChatOpenAI 实例

当前统一使用 DeepSeek OpenAI-compatible API：
  - AGENT_LLM_BASE_URL=https://api.deepseek.com
  - AGENT_LLM_MODEL=deepseek-v4-flash

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


def _provider_headers() -> dict[str, str]:
    default_headers: dict[str, str] = {}
    http_referer = _optional("AGENT_LLM_HTTP_REFERER")
    app_title = _optional("AGENT_LLM_APP_TITLE")
    if http_referer:
        default_headers["HTTP-Referer"] = http_referer
    if app_title:
        default_headers["X-Title"] = app_title
    return default_headers


@lru_cache(maxsize=2)
def get_llm_for_tier(tier: str = "balanced") -> ChatOpenAI:
    """Return the shared DeepSeek chat model. Tier only tunes generation settings."""
    if tier not in ("fast", "balanced", "strong"):
        tier = "balanced"

    api_key = _require("AGENT_LLM_API_KEY")
    base_url = _require("AGENT_LLM_BASE_URL")
    model = _require("AGENT_LLM_MODEL")
    temperature = float(_optional("AGENT_LLM_TEMPERATURE", "0.2" if tier == "fast" else "0.4"))
    max_tokens = int(_optional("AGENT_LLM_MAX_TOKENS", "1000" if tier == "fast" else "2200"))
    default_headers = _provider_headers()

    return ChatOpenAI(
        model=model,
        api_key=api_key,        # type: ignore[arg-type]
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
        default_headers=default_headers or None,
        streaming=tier != "fast",
    )


def get_llm() -> ChatOpenAI:
    """主辅导模型。当前统一指向 DeepSeek。"""
    return get_llm_for_tier("balanced")


def get_fast_llm() -> ChatOpenAI:
    """结构化/定位任务模型。当前统一指向 DeepSeek。"""
    return get_llm_for_tier("fast")


def get_strong_llm() -> ChatOpenAI:
    """兼容旧调用。当前统一指向 DeepSeek。"""
    return get_llm_for_tier("strong")


def get_settings() -> dict:
    """返回当前配置摘要（用于 /health 接口展示，不含敏感 key）"""
    model = os.environ.get("AGENT_LLM_MODEL", "未配置")
    base_url = os.environ.get("AGENT_LLM_BASE_URL", "未配置")
    tracing = os.environ.get("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    project = os.environ.get("LANGSMITH_PROJECT", "")
    return {
        "model": model,
        "models": {"fast": model, "balanced": model, "strong": model},
        "base_url": base_url,
        "base_urls": {"fast": base_url, "balanced": base_url, "strong": base_url},
        "langsmith_tracing": tracing,
        "langsmith_project": project if tracing else None,
    }
