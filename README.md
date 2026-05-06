# LatentLearn

## LLM Configuration

All LLM runtime settings live in `.env.local`. Use `.env.local.example` as the template.

The app calls an OpenAI-compatible Chat Completions endpoint:

```text
POST {LLM_BASE_URL}{LLM_CHAT_COMPLETIONS_PATH}
```

Important fields:

- `LLM_PROVIDER`: label for the active channel, such as `openrouter`, `deepseek`, or `qwen`.
- `LLM_API_KEY`: API key for that channel.
- `LLM_BASE_URL`: provider base URL.
- `LLM_CHAT_COMPLETIONS_PATH`: chat-completions endpoint path.
- `LLM_MODEL`: provider model id.
- `LLM_REQUIRE_FREE_MODEL`: set `true` for OpenRouter free models that end with `:free`; set `false` for official Qwen or DeepSeek APIs.
- `LLM_TEMPERATURE` and `LLM_MAX_TOKENS`: generation settings.

Example providers:

```env
# OpenRouter
LLM_PROVIDER=openrouter
LLM_BASE_URL=https://openrouter.ai
LLM_CHAT_COMPLETIONS_PATH=/api/v1/chat/completions
LLM_MODEL=openai/gpt-oss-120b:free
LLM_REQUIRE_FREE_MODEL=true
```

```env
# DeepSeek official API
LLM_PROVIDER=deepseek
LLM_BASE_URL=https://api.deepseek.com
LLM_CHAT_COMPLETIONS_PATH=/chat/completions
LLM_MODEL=deepseek-chat
LLM_REQUIRE_FREE_MODEL=false
```

```env
# Qwen / Alibaba DashScope OpenAI-compatible API
LLM_PROVIDER=qwen
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_CHAT_COMPLETIONS_PATH=/chat/completions
LLM_MODEL=qwen-plus
LLM_REQUIRE_FREE_MODEL=false
```
