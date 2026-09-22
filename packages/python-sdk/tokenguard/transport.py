"""
Transport — sends trace payloads to the TokenGuard ingest API.
Handles retries, timeouts, and never crashes the host application.
"""
from __future__ import annotations

import json
import time
import threading
from typing import Any, Dict, List, Optional
import requests


class Transport:
    """
    Thread-safe HTTP transport with buffered queue and retry logic.
    Sends traces in a background thread so it never blocks the app.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str,
        max_retries: int = 3,
        retry_delay: float = 0.5,
        timeout: float = 10.0,
        debug: bool = False,
    ):
        self.api_key = api_key
        self.ingest_url = base_url.rstrip("/") + "/api/v1/ingest"
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.timeout = timeout
        self.debug = debug

        self._queue: List[Dict[str, Any]] = []
        self._lock = threading.Lock()

    def enqueue(self, payload: Dict[str, Any]) -> None:
        """Add a trace payload to the send queue and dispatch immediately."""
        with self._lock:
            self._queue.append(payload)

        # Send in background thread so it never blocks the caller
        thread = threading.Thread(target=self._send, args=(payload,), daemon=True)
        thread.start()

    def _send(self, payload: Dict[str, Any]) -> None:
        """Send a single payload with retries."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    self.ingest_url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout,
                )

                if response.status_code == 201:
                    if self.debug:
                        print(f"[TokenGuard] Trace sent: {response.json().get('traceId')}")
                    return

                # 4xx errors — don't retry
                if 400 <= response.status_code < 500:
                    if self.debug:
                        print(f"[TokenGuard] Client error {response.status_code}: {response.text}")
                    return

                # 5xx — retry
                if self.debug:
                    print(f"[TokenGuard] Server error {response.status_code}, retrying ({attempt + 1}/{self.max_retries})")

            except requests.exceptions.RequestException as e:
                if self.debug:
                    print(f"[TokenGuard] Request failed: {e}, retrying ({attempt + 1}/{self.max_retries})")

            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay * (2 ** attempt))

    def flush(self) -> None:
        """Wait for all background threads to complete (best-effort)."""
        # Give background threads up to 5 seconds to finish
        time.sleep(0.5)
