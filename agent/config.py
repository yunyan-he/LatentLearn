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


def _tier_env(tier: str, suffix: str, fallback_suffix: str | None = None) -> str:
    configured = _optional(f"AGENT_LLM_{tier.upper()}_{suffix}")
    if configured:
        return configured

    fallback_name = f"AGENT_LLM_{fallback_suffix or suffix}"
    fallback = _optional(fallback_name)
    if fallback:
        return fallback

    raise RuntimeError(
        f"Missing required environment variable: AGENT_LLM_{tier.upper()}_{suffix} or {fallback_name}\n"
        f"Please set it in agent/.env.agent"
    )


def _model_for_tier(tier: str) -> str:
    return _tier_env(tier, "MODEL")


def _api_key_for_tier(tier: str) -> str:
    return _tier_env(tier, "API_KEY")


def _base_url_for_tier(tier: str) -> str:
    return _tier_env(tier, "BASE_URL")


def _max_tokens_for_tier(tier: str, default: str) -> int:
    return int(_optional(f"AGENT_LLM_{tier.upper()}_MAX_TOKENS", _optional("AGENT_LLM_MAX_TOKENS", default)))


def _temperature_for_tier(tier: str, default: str) -> float:
    return float(_optional(f"AGENT_LLM_{tier.upper()}_TEMPERATURE", _optional("AGENT_LLM_TEMPERATURE", default)))


def _provider_headers(tier: str) -> dict[str, str]:
    default_headers: dict[str, str] = {}
    http_referer = _optional(f"AGENT_LLM_{tier.upper()}_HTTP_REFERER", _optional("AGENT_LLM_HTTP_REFERER"))
    app_title = _optional(f"AGENT_LLM_{tier.upper()}_APP_TITLE", _optional("AGENT_LLM_APP_TITLE"))
    if http_referer:
        default_headers["HTTP-Referer"] = http_referer
    if app_title:
        default_headers["X-Title"] = app_title
    return default_headers


@lru_cache(maxsize=8)
def get_llm_for_tier(tier: str) -> ChatOpenAI:
    """Return a cached OpenAI-compatible chat model for a workload tier."""
    if tier not in ("fast", "balanced", "strong"):
        raise ValueError(f"Unsupported LLM tier: {tier}")

    api_key = _api_key_for_tier(tier)
    base_url = _base_url_for_tier(tier)
    model = _model_for_tier(tier)
    temperature = _temperature_for_tier(tier, "0.2" if tier == "fast" else "0.4")
    max_tokens = _max_tokens_for_tier(tier, "1000" if tier == "fast" else "2000")
    default_headers = _provider_headers(tier)

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
    """兼容旧调用：主辅导模型现在映射到 balanced tier。"""
    return get_llm_for_tier("balanced")


def get_fast_llm() -> ChatOpenAI:
    """兼容旧调用：结构化/定位任务映射到 fast tier。"""
    return get_llm_for_tier("fast")


def get_strong_llm() -> ChatOpenAI:
    """复杂讲解、深度推理或后续评估可显式使用 strong tier。"""
    return get_llm_for_tier("strong")


def get_settings() -> dict:
    """返回当前配置摘要（用于 /health 接口展示，不含敏感 key）"""
    base_urls = {
        "fast": _base_url_for_tier("fast") if (_optional("AGENT_LLM_FAST_API_KEY") or _optional("AGENT_LLM_API_KEY")) else "未配置",
        "balanced": _base_url_for_tier("balanced") if (_optional("AGENT_LLM_BALANCED_API_KEY") or _optional("AGENT_LLM_API_KEY")) else "未配置",
        "strong": _base_url_for_tier("strong") if (_optional("AGENT_LLM_STRONG_API_KEY") or _optional("AGENT_LLM_API_KEY")) else "未配置",
    }
    models = {
        "fast": _model_for_tier("fast") if base_urls["fast"] != "未配置" else "未配置",
        "balanced": _model_for_tier("balanced") if base_urls["balanced"] != "未配置" else "未配置",
        "strong": _model_for_tier("strong") if base_urls["strong"] != "未配置" else "未配置",
    }
    tracing = os.environ.get("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    project = os.environ.get("LANGSMITH_PROJECT", "")
    return {
        "model": models["balanced"],
        "models": models,
        "base_url": base_urls["balanced"],
        "base_urls": base_urls,
        "langsmith_tracing": tracing,
        "langsmith_project": project if tracing else None,
    }
