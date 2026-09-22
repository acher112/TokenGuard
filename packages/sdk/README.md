# tokenguard

**Monitor AI agents. Track LLM costs. Debug failures.**

TokenGuard is a developer SDK that records every AI request your app makes — which models were called, how many tokens were used, how much it cost, and where it failed.

## Install

```bash
npm install tokenguard
# or
pip install tokenguard  # Python SDK
```

## Quick Start — Node.js

```typescript
import TokenGuard from "tokenguard";

const aw = new TokenGuard({
  apiKey: "tg_live_...",          // from your TokenGuard dashboard
  baseUrl: "https://yourapp.com", // your TokenGuard deployment
});

// Wrap your OpenAI client — automatic tracking
const client = aw.wrapOpenAI(new OpenAI());

// All calls are now tracked automatically
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
});
```

## Quick Start — Python

```python
from tokenguard import TokenGuard

aw = TokenGuard(api_key="tg_live_...", base_url="https://yourapp.com")

# Wrap your OpenAI client
client = aw.wrap_openai(OpenAI())

# All calls tracked automatically
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
```

## Manual Tracing

```typescript
// Node.js
const result = await aw.trace("my-agent", async (trace) => {
  const llm = trace.llm({ model: "gpt-4o", provider: "openai" });
  const response = await openai.chat.completions.create({ ... });
  llm.end({ inputTokens: 100, outputTokens: 50 });
  return response;
});
```

```python
# Python
with aw.trace("diet-agent") as trace:
    llm = trace.llm(model="llama3-8b-8192", provider="groq")
    response = groq_client.chat.completions.create(...)
    llm.end(input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens)
```

## What you see in the dashboard

- 💰 **Cost per request** — exactly how much each AI call costs
- 🐛 **Errors** — where and why your agent failed
- ⏱️ **Latency** — how long each step takes
- 📊 **Model breakdown** — which models you use most
- 🚨 **Alerts** — get notified when costs spike or errors increase
- 💡 **Waste detection** — find expensive prompts and unnecessary retries

## Supported providers

| Provider | Auto-tracking | Manual |
|---|---|---|
| OpenAI | ✅ `wrapOpenAI()` | ✅ |
| Groq | ✅ `wrapGroq()` | ✅ |
| Anthropic | Coming soon | ✅ |
| Any LLM | — | ✅ |

## Links

- [Dashboard](https://yourapp.com)
- [Documentation](https://yourapp.com/docs)
- [GitHub](https://github.com/yourusername/tokenguard)
