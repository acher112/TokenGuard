"""
Quick test — verifies the TokenGuard Python SDK works
with your local TokenGuard instance.

Run: python test_sdk.py
"""
import sys
import os

# Add the SDK to path (before publishing to PyPI)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../tokenguard/packages/python-sdk"))

from tokenguard import TokenGuard

# ── Config ────────────────────────────────────────────────────────────────────

API_KEY = "tg_live_REPLACE_WITH_YOUR_KEY"  # paste your key from Settings
BASE_URL = "http://localhost:3000"

# ── Test ──────────────────────────────────────────────────────────────────────

aw = TokenGuard(api_key=API_KEY, base_url=BASE_URL, debug=True)

print("Sending test trace to TokenGuard...")

with aw.trace("DietSuggestionAgent") as trace:
    # Simulate a Groq LLM call (no real API needed for this test)
    llm = trace.llm(model="llama3-8b-8192", provider="groq")

    # Simulate what Groq would return
    import time
    time.sleep(0.3)  # simulate API latency

    # Pretend we got this response from Groq
    llm.end(input_tokens=420, output_tokens=280)

    # Also track a tool call
    tool = trace.tool("nutrition_lookup")
    time.sleep(0.1)
    tool.end(result={"calories": 1800, "protein": "120g"})

aw.flush()

print("\n✅ Done! Check your dashboard at http://localhost:3000/dashboard")
print("   You should see a trace from 'DietSuggestionAgent'")
