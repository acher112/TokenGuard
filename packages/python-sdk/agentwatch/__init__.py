"""
AgentWatch Python SDK
Monitor AI agents, track LLM costs, debug failures.
"""

from .client import AgentWatch
from .trace import TraceContext

__version__ = "0.1.0"
__all__ = ["AgentWatch", "TraceContext"]
