# agentwatch (Python SDK)

**Monitor AI agents, track LLM costs, debug failures — in 2 lines of code.**

## Install

```bash
pip install agentwatch
```

## Quick Start — Auto-wrap Groq (zero code change)

```python
from groq import Groq
from agentwatch import AgentWatch

aw = AgentWatch(
    api_key="aw_live_...",           # from your dashboard Settings
    base_url="http://localhost:3000", # your AgentWatch URL
)

# Wrap your existing Groq client — ONE LINE
groq = aw.wrap_groq(Groq(api_key="..."), agent_name="DietAgent")

# Use exactly as before — tracking happens automatically
response = groq.chat.completions.create(
    model="llama3-8b-8192",
    messages=[{"role": "user", "content": "Give me a low-carb meal plan"}],
)

print(response.choices[0].message.content)
# → Your dashboard now shows cost, tokens, latency for this call
```

## Quick Start — Auto-wrap OpenAI

```python
from openai import OpenAI
from agentwatch import AgentWatch

aw = AgentWatch(api_key="aw_live_...", base_url="http://localhost:3000")

# Wrap your OpenAI client
openai = aw.wrap_openai(OpenAI(api_key="..."), agent_name="SupportBot")

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
```

## Manual Tracing (full control)

```python
from agentwatch import AgentWatch

aw = AgentWatch(api_key="aw_live_...", base_url="http://localhost:3000")

def get_diet_plan(user_message):
    with aw.trace("DietSuggestionAgent") as trace:

        # Track the Groq call
        llm = trace.llm(model="llama3-8b-8192", provider="groq")
        response = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": user_message}],
        )
        llm.end(
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )

        # Track a tool call (optional)
        tool = trace.tool("nutrition_database_lookup")
        foods = lookup_foods(user_message)
        tool.end(result=foods)

        return response.choices[0].message.content
```

## What appears in your dashboard

Every call shows:
- 💰 **Cost** — exact cost per request
- ⏱️ **Latency** — how long it took
- 🔢 **Tokens** — input and output token counts
- 🐛 **Errors** — full error details with stack traces
- 📊 **Agent breakdown** — which agents cost the most

## Supported providers

| Provider | Method | Notes |
|---|---|---|
| **Groq** | `aw.wrap_groq(client)` | LLaMA, Mixtral, Gemma |
| **OpenAI** | `aw.wrap_openai(client)` | GPT-4o, GPT-4o-mini |
| **Any LLM** | Manual `trace.llm()` | Works with any provider |

## Before you exit your script

```python
aw.flush()  # makes sure all traces are sent before process ends
```
