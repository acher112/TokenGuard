"""
TokenGuard Python Client — main entry point.

Usage:
    from tokenguard import TokenGuard

    aw = TokenGuard(api_key="tg_live_...", base_url="http://localhost:3000")

    # Option 1: Auto-wrap OpenAI
    client = aw.wrap_openai(OpenAI())

    # Option 2: Auto-wrap Groq
    client = aw.wrap_groq(Groq())

    # Option 3: Manual tracing
    with aw.trace("my-agent") as trace:
        llm = trace.llm(model="gpt-4o", provider="openai")
        response = openai_client.chat.completions.create(...)
        llm.end(
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
"""
from __future__ import annotations

import json
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator, Optional

from .transport import Transport
from .trace import TraceContext


def _now_iso() -> str:
    """Return UTC datetime in Zod-compatible format: 2026-09-15T12:03:19.123Z"""
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


import os

DEFAULT_BASE_URL = os.environ.get("TOKENGUARD_BASE_URL", "https://tokenguard-app-two.vercel.app")


class TokenGuard:
    """
    TokenGuard Python SDK client.

    Args:
        api_key: Your TokenGuard API key (from dashboard or TOKENGUARD_API_KEY env var)
        base_url: URL of your TokenGuard deployment (default: https://tokenguard-app-two.vercel.app)
        debug: Print debug logs (default: False)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        debug: bool = False,
    ):
        resolved_key = api_key or os.environ.get("TOKENGUARD_API_KEY")
        if not resolved_key:
            raise ValueError(
                "TokenGuard: api_key is required. Pass api_key='tg_live_...' or set TOKENGUARD_API_KEY in your environment."
            )

        self._api_key = resolved_key
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._debug = debug
        self._transport = Transport(
            api_key=self._api_key,
            base_url=self._base_url,
            debug=debug,
        )

    # ─── Context manager trace ────────────────────────────────────────────────

    @contextmanager
    def trace(
        self,
        agent_name: str,
        user_id: Optional[str] = None,
        tags: Optional[list] = None,
        session_id: Optional[str] = None,
    ) -> Generator[TraceContext, None, None]:
        """
        Context manager that wraps an agent execution in a trace.

        Usage:
            with aw.trace("diet-agent", session_id="session-abc123") as trace:
                llm = trace.llm(model="llama3-8b-8192", provider="groq")
                response = groq.chat.completions.create(...)
                llm.end(
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                )
        """
        ctx = TraceContext()
        started_at = _now_iso()
        start_time = time.time()

        try:
            yield ctx
        except Exception as e:
            ctx.error(e)
            ctx.status = "failed"
            raise
        finally:
            ended_at = _now_iso()
            duration_ms = int((time.time() - start_time) * 1000)

            payload = {
                "agentName": agent_name,
                "status": ctx.status,
                "startedAt": started_at,
                "endedAt": ended_at,
                "durationMs": duration_ms,
                "steps": ctx.steps,
            }

            if user_id:
                payload["userId"] = user_id
            if tags:
                payload["tags"] = tags
            if session_id:
                payload["sessionId"] = session_id

            self._transport.enqueue(payload)


    # ─── OpenAI auto-instrumentation ─────────────────────────────────────────

    def wrap_openai(self, client: Any, agent_name: str = "OpenAIAgent", session_id: Optional[str] = None) -> Any:
        """
        Wrap an OpenAI client to automatically track all chat.completions.create calls.

        Usage:
            from openai import OpenAI
            client = aw.wrap_openai(OpenAI(), session_id="my-session-123")
            # All calls now tracked automatically
            response = client.chat.completions.create(model="gpt-4o", messages=[...])
        """
        return _wrap_client(client, self._transport, agent_name, provider="openai", session_id=session_id)

    # ─── Groq auto-instrumentation ────────────────────────────────────────────

    def wrap_groq(self, client: Any, agent_name: str = "GroqAgent", session_id: Optional[str] = None) -> Any:
        """
        Wrap a Groq client to automatically track all chat.completions.create calls.

        Usage:
            from groq import Groq
            client = aw.wrap_groq(Groq(), session_id="my-session-123")
            # All calls now tracked automatically
            response = client.chat.completions.create(model="llama3-8b-8192", messages=[...])
        """
        return _wrap_client(client, self._transport, agent_name, provider="groq", session_id=session_id)


    # ─── Flush ────────────────────────────────────────────────────────────────

    def flush(self) -> None:
        """Wait for all pending traces to be sent. Call before your process exits."""
        self._transport.flush()


# ─── Client wrapper (works for both OpenAI and Groq) ─────────────────────────

class _WrappedCompletions:
    """Wraps the chat.completions object to intercept .create() calls."""

    def __init__(self, original_completions: Any, transport: Transport, agent_name: str, provider: str, session_id: Optional[str] = None):
        self._completions = original_completions
        self._transport = transport
        self._agent_name = agent_name
        self._provider = provider
        self._session_id = session_id

    def create(self, **kwargs: Any) -> Any:
        started_at = _now_iso()
        start_time = time.time()
        model = kwargs.get("model", "unknown")

        try:
            response = self._completions.create(**kwargs)
            ended_at = _now_iso()
            duration_ms = int((time.time() - start_time) * 1000)

            # Extract token usage
            input_tokens = 0
            output_tokens = 0
            if hasattr(response, "usage") and response.usage:
                input_tokens = getattr(response.usage, "prompt_tokens", 0) or 0
                output_tokens = getattr(response.usage, "completion_tokens", 0) or 0

            # Extract request / response content
            request_json = None
            response_json = None
            try:
                if "messages" in kwargs:
                    request_json = json.dumps(kwargs.get("messages", []))
                if hasattr(response, "choices") and response.choices:
                    first_choice = response.choices[0]
                    if hasattr(first_choice, "message") and hasattr(first_choice.message, "content"):
                        response_json = first_choice.message.content
            except Exception:
                pass

            payload = {
                "agentName": self._agent_name,
                "status": "success",
                "startedAt": started_at,
                "endedAt": ended_at,
                "durationMs": duration_ms,
                "steps": [{
                    "stepType": "llm",
                    "sequence": 1,
                    "name": f"{self._provider}/{model}",
                    "startedAt": started_at,
                    "endedAt": ended_at,
                    "durationMs": duration_ms,
                    "llmCall": {
                        "modelName": model,
                        "provider": self._provider,
                        "inputTokens": input_tokens,
                        "outputTokens": output_tokens,
                        "requestJson": request_json,
                        "responseJson": response_json,
                    },
                }],
            }

            if self._session_id:
                payload["sessionId"] = self._session_id

            self._transport.enqueue(payload)
            return response

        except Exception as e:
            ended_at = _now_iso()
            duration_ms = int((time.time() - start_time) * 1000)

            payload = {
                "agentName": self._agent_name,
                "status": "failed",
                "startedAt": started_at,
                "endedAt": ended_at,
                "durationMs": duration_ms,
                "steps": [{
                    "stepType": "error",
                    "sequence": 1,
                    "name": "LLM call failed",
                    "startedAt": started_at,
                    "endedAt": ended_at,
                    "durationMs": duration_ms,
                    "error": {
                        "errorType": type(e).__name__,
                        "message": str(e),
                    },
                }],
            }

            if self._session_id:
                payload["sessionId"] = self._session_id

            self._transport.enqueue(payload)
            raise


class _WrappedChat:
    def __init__(self, original_chat: Any, transport: Transport, agent_name: str, provider: str, session_id: Optional[str] = None):
        self.completions = _WrappedCompletions(
            original_chat.completions, transport, agent_name, provider, session_id=session_id
        )


class _WrappedClient:
    """Proxy client that intercepts chat.completions.create calls."""

    def __init__(self, original_client: Any, transport: Transport, agent_name: str, provider: str, session_id: Optional[str] = None):
        self._original = original_client
        self.chat = _WrappedChat(original_client.chat, transport, agent_name, provider, session_id=session_id)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._original, name)


def _wrap_client(client: Any, transport: Transport, agent_name: str, provider: str, session_id: Optional[str] = None) -> Any:
    return _WrappedClient(client, transport, agent_name, provider, session_id=session_id)


def wrap_openai(client: Any, tg: Optional[TokenGuard] = None, agent_name: str = "OpenAIAgent", session_id: Optional[str] = None) -> Any:
    """Convenience function to wrap an OpenAI client."""
    guard = tg if tg is not None else TokenGuard()
    return guard.wrap_openai(client, agent_name=agent_name, session_id=session_id)


def wrap_groq(client: Any, tg: Optional[TokenGuard] = None, agent_name: str = "GroqAgent", session_id: Optional[str] = None) -> Any:
    """Convenience function to wrap a Groq client."""
    guard = tg if tg is not None else TokenGuard()
    return guard.wrap_groq(client, agent_name=agent_name, session_id=session_id)

