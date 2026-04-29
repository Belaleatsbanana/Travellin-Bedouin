from __future__ import annotations
import asyncio
from datetime import datetime
from typing import Any, Optional

from models.agents import AgentState, AgentThought
from models.session import TripFormData

AGENT_IDS = ["budget", "visa_insurance", "accommodation", "transportation", "activities"]


class SessionState:
    def __init__(self, session_id: str, form_data: TripFormData) -> None:
        self.session_id = session_id
        self.form_data = form_data
        self.agents: dict[str, AgentState] = {
            aid: AgentState(agentId=aid, status="pending", progress=0, thoughts=[])
            for aid in AGENT_IDS
        }
        self.overall_status: str = "running"
        self.results: dict[str, Any] = {}
        self.created_at: datetime = datetime.utcnow()
        self._lock = asyncio.Lock()

    def all_completed(self) -> bool:
        return all(a.status == "completed" for a in self.agents.values())

    def any_failed(self) -> bool:
        return any(a.status == "failed" for a in self.agents.values())


# In-memory store — replace with Redis for production
_sessions: dict[str, SessionState] = {}


def create_session(session_id: str, form_data: TripFormData) -> SessionState:
    state = SessionState(session_id, form_data)
    _sessions[session_id] = state
    return state


def get_session(session_id: str) -> Optional[SessionState]:
    return _sessions.get(session_id)


def delete_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


# ─── Helper coroutines used by agents ────────────────────────────────────────

async def emit_thought(
    session_id: str,
    agent_id: str,
    message: str,
    thought_type: str = "info",
) -> None:
    state = get_session(session_id)
    if not state:
        return
    thought = AgentThought(
        timestamp=datetime.utcnow().isoformat() + "Z",
        message=message,
        type=thought_type,  # type: ignore[arg-type]
    )
    async with state._lock:
        state.agents[agent_id].thoughts.append(thought)


async def update_progress(
    session_id: str,
    agent_id: str,
    progress: int,
    status: Optional[str] = None,
) -> None:
    state = get_session(session_id)
    if not state:
        return
    async with state._lock:
        agent = state.agents[agent_id]
        agent.progress = max(agent.progress, progress)
        if status:
            agent.status = status  # type: ignore[assignment]
            if status == "running" and agent.startedAt is None:
                agent.startedAt = datetime.utcnow().isoformat() + "Z"
            elif status in ("completed", "failed"):
                agent.completedAt = datetime.utcnow().isoformat() + "Z"


async def store_result(session_id: str, key: str, data: Any) -> None:
    state = get_session(session_id)
    if not state:
        return
    async with state._lock:
        state.results[key] = data
        if state.all_completed():
            state.overall_status = "completed"
        elif state.any_failed():
            state.overall_status = "failed"
