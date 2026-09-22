"""
TraceContext — holds steps for a single agent trace execution.
Used as a context manager or directly.
"""
from __future__ import annotations

import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _now_iso() -> str:
    """Return UTC datetime in Zod-compatible format: 2026-09-15T12:03:19.123Z"""
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class LlmSpan:
    """Tracks a single LLM call within a trace."""

    def __init__(self, model: str, provider: str, steps: List[Dict], sequence: int):
        self._model = model
        self._provider = provider
        self._steps = steps
        self._sequence = sequence
        self._started_at = _now_iso()
        self._start_time = time.time()

    def end(
        self,
        input_tokens: int,
        output_tokens: int,
        response: Any = None,
    ) -> None:
        duration_ms = int((time.time() - self._start_time) * 1000)
        self._steps.append({
            "stepType": "llm",
            "sequence": self._sequence,
            "name": f"{self._provider}/{self._model}",
            "startedAt": self._started_at,
            "endedAt": _now_iso(),
            "durationMs": duration_ms,
            "llmCall": {
                "modelName": self._model,
                "provider": self._provider,
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
            },
        })

    def fail(self, error: Exception) -> None:
        duration_ms = int((time.time() - self._start_time) * 1000)
        self._steps.append({
            "stepType": "error",
            "sequence": self._sequence,
            "name": "LLM call failed",
            "startedAt": self._started_at,
            "endedAt": _now_iso(),
            "durationMs": duration_ms,
            "error": {
                "errorType": type(error).__name__,
                "message": str(error),
            },
        })


class ToolSpan:
    """Tracks a single tool/function call within a trace."""

    def __init__(self, name: str, steps: List[Dict], sequence: int):
        self._name = name
        self._steps = steps
        self._sequence = sequence
        self._started_at = _now_iso()
        self._start_time = time.time()

    def end(self, result: Any = None) -> None:
        duration_ms = int((time.time() - self._start_time) * 1000)
        self._steps.append({
            "stepType": "tool",
            "sequence": self._sequence,
            "name": self._name,
            "startedAt": self._started_at,
            "endedAt": _now_iso(),
            "durationMs": duration_ms,
            "toolCall": {
                "toolName": self._name,
                "status": "success",
                "resultJson": str(result) if result is not None else None,
            },
        })

    def fail(self, error: Exception) -> None:
        duration_ms = int((time.time() - self._start_time) * 1000)
        self._steps.append({
            "stepType": "error",
            "sequence": self._sequence,
            "name": f"Tool failed: {self._name}",
            "startedAt": self._started_at,
            "endedAt": _now_iso(),
            "durationMs": duration_ms,
            "error": {
                "errorType": type(error).__name__,
                "message": str(error),
            },
        })


class TraceContext:
    """
    Active trace context. Add LLM calls, tool calls, and errors to it.

    Usage:
        with aw.trace("my-agent") as trace:
            llm = trace.llm(model="gpt-4o", provider="openai")
            response = client.chat.completions.create(...)
            llm.end(input_tokens=100, output_tokens=50)
    """

    def __init__(self):
        self._steps: List[Dict] = []
        self._sequence = 0
        self.status = "success"

    def llm(self, model: str, provider: str = "openai") -> LlmSpan:
        """Start tracking an LLM call."""
        self._sequence += 1
        return LlmSpan(model=model, provider=provider, steps=self._steps, sequence=self._sequence)

    def tool(self, name: str) -> ToolSpan:
        """Start tracking a tool/function call."""
        self._sequence += 1
        return ToolSpan(name=name, steps=self._steps, sequence=self._sequence)

    def error(self, error: Exception, wasted_cost_usd: float = 0.0) -> None:
        """Record an error that occurred during the trace."""
        self._sequence += 1
        self._steps.append({
            "stepType": "error",
            "sequence": self._sequence,
            "name": type(error).__name__,
            "startedAt": _now_iso(),
            "endedAt": _now_iso(),
            "durationMs": 0,
            "error": {
                "errorType": type(error).__name__,
                "message": str(error),
                "wastedCostUsd": str(wasted_cost_usd),
            },
        })
        self.status = "failed"

    @property
    def steps(self) -> List[Dict]:
        return self._steps
