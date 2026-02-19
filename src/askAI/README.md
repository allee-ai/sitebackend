# askAI Module

> **Status: Stub** — The API surface is defined and deployed; the AI integration logic is left as a `TODO` for the next sprint.

## Overview

This module will expose a question-answering endpoint for the allee-ai.com front end. When complete, it will:

1. Accept a user question via HTTP POST
2. Call a configurable AI provider (OpenAI, Anthropic, or a custom model)
3. Return a structured response with the answer and token-usage metadata

## Environment Variables (future)

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `openai` \| `anthropic` \| `custom` |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | Required when `AI_PROVIDER=anthropic` |
| `AI_MODEL` | Model identifier, e.g. `gpt-4o` or `claude-3-5-sonnet-20241022` |
| `AI_MAX_TOKENS` | Max tokens per response (default: 1024) |

## API Reference

### `POST /api/ask-ai/ask`

Ask a question. Currently returns a stub response.

**Request body:**
```json
{
  "question": "What is allee-ai?"
}
```

**Response (stub):**
```json
{
  "answer": "[stub] Received your question: \"What is allee-ai?\"",
  "model": "stub",
  "usage": null
}
```

**Response (production — planned):**
```json
{
  "answer": "allee-ai is ...",
  "model": "gpt-4o",
  "usage": {
    "promptTokens": 15,
    "completionTokens": 42,
    "totalTokens": 57
  }
}
```

### `GET /api/ask-ai/health`

Returns readiness status of the module.

```json
{ "status": "ok", "module": "askAI", "ready": false }
```

`ready` will become `true` once the AI provider is integrated and credentials are present.

## TODO

- [ ] Implement AI provider abstraction (`src/askAI/providers/`)
- [ ] Add streaming support (`Transfer-Encoding: chunked`)
- [ ] Add rate-limiting per IP / per user
- [ ] Add conversation context / session management
- [ ] Write integration tests
