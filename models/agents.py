"""
models/agents.py
Pydantic models for AgentState and AgentThought — used by all agents
and returned by GET /api/sessions/{sessionId}/status.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AgentStatus(str, Enum):
    pending   = "pending"
    running   = "running"
    completed = "completed"
    failed    = "failed"


class ThoughtType(str, Enum):
    info     = "info"
    search   = "search"
    decision = "decision"
    warning  = "warning"


class AgentId(str, Enum):
    budget         = "budget"
    visa_insurance = "visa_insurance"
    accommodation  = "accommodation"
    transportation = "transportation"
    activities     = "activities"


class OverallStatus(str, Enum):
    running   = "running"
    completed = "completed"
    failed    = "failed"


# ---------------------------------------------------------------------------
# Core thought model
# ---------------------------------------------------------------------------

class AgentThought(BaseModel):
    """A single log entry emitted by an agent while it works."""
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    message: str
    type: ThoughtType = ThoughtType.info


# ---------------------------------------------------------------------------
# Per-agent state
# ---------------------------------------------------------------------------

class AgentState(BaseModel):
    """
    Tracks status, progress, and the full thought log for one agent.
    Stored inside SessionState and serialised into the /status response.
    """
    agentId: AgentId
    status: AgentStatus = AgentStatus.pending
    progress: int = Field(default=0, ge=0, le=100)
    thoughts: List[AgentThought] = Field(default_factory=list)
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None

    # ------------------------------------------------------------------ helpers

    def start(self) -> None:
        self.status    = AgentStatus.running
        self.progress  = 5
        self.startedAt = datetime.now(timezone.utc).isoformat()

    def add_thought(
        self,
        message: str,
        thought_type: ThoughtType = ThoughtType.info,
    ) -> None:
        self.thoughts.append(
            AgentThought(
                timestamp=datetime.now(timezone.utc).isoformat(),
                message=message,
                type=thought_type,
            )
        )

    def set_progress(self, value: int) -> None:
        """Monotonically advance progress (never allow it to decrease)."""
        self.progress = max(self.progress, min(100, value))

    def complete(self) -> None:
        self.status      = AgentStatus.completed
        self.progress    = 100
        self.completedAt = datetime.now(timezone.utc).isoformat()

    def fail(self, reason: str = "Agent encountered an unrecoverable error.") -> None:
        self.status      = AgentStatus.failed
        self.completedAt = datetime.now(timezone.utc).isoformat()
        self.add_thought(reason, ThoughtType.warning)


# ---------------------------------------------------------------------------
# Session-level status wrapper (returned by GET /status)
# ---------------------------------------------------------------------------

class SessionAgentsStatus(BaseModel):
    sessionId: str
    overallStatus: OverallStatus
    agents: dict[str, AgentState]

    @classmethod
    def from_agent_map(
        cls,
        session_id: str,
        agents: dict[str, AgentState],
    ) -> "SessionAgentsStatus":
        all_completed = all(
            a.status == AgentStatus.completed for a in agents.values()
        )
        any_failed = any(
            a.status == AgentStatus.failed for a in agents.values()
        )

        if all_completed:
            overall = OverallStatus.completed
        elif any_failed:
            overall = OverallStatus.failed
        else:
            overall = OverallStatus.running

        return cls(
            sessionId=session_id,
            overallStatus=overall,
            agents=agents,
        )
