from __future__ import annotations
import asyncio
from datetime import datetime
from typing import Any, Literal, Optional

from models.agents import AgentThought
from models.session import ChatMessage, TripFormData

PIPELINE_PHASES = ["accommodation", "activities", "transportation"]

PhaseStatus = Literal["pending", "running", "completed", "confirmed", "failed"]


class PhaseState:
    def __init__(self, phase_id: str) -> None:
        self.phase_id = phase_id
        self.status: PhaseStatus = "pending"
        self.progress: int = 0
        self.thoughts: list[AgentThought] = []
        self.result: dict | None = None
        self.chat_history: list[ChatMessage] = []
        self.startedAt: str | None = None
        self.completedAt: str | None = None


class SessionState:
    def __init__(self, session_id: str, form_data: TripFormData) -> None:
        self.session_id = session_id
        self.form_data = form_data
        self.overall_status: str = "initializing"
        self.current_phase: str = "accommodation"
        self.phases: dict[str, PhaseState] = {
            p: PhaseState(p) for p in PIPELINE_PHASES
        }
        self.budget_result: dict | None = None
        self.confirmed_accommodation: dict | None = None
        self.confirmed_activities: dict | None = None
        self.confirmed_transport: dict | None = None
        self.created_at: datetime = datetime.utcnow()
        self._lock = asyncio.Lock()


# In-memory store
_sessions: dict[str, SessionState] = {}


def create_session(session_id: str, form_data: TripFormData) -> SessionState:
    state = SessionState(session_id, form_data)
    _sessions[session_id] = state
    return state


def get_session(session_id: str) -> Optional[SessionState]:
    return _sessions.get(session_id)


def delete_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


# ─── Phase helpers ────────────────────────────────────────────────────────────

async def emit_thought(
    session_id: str,
    phase_id: str,
    message: str,
    thought_type: str = "info",
) -> None:
    state = get_session(session_id)
    if not state or phase_id not in state.phases:
        return
    thought = AgentThought(
        timestamp=datetime.utcnow().isoformat() + "Z",
        message=message,
        type=thought_type,  # type: ignore[arg-type]
    )
    async with state._lock:
        state.phases[phase_id].thoughts.append(thought)


async def update_progress(
    session_id: str,
    phase_id: str,
    progress: int,
    status: Optional[str] = None,
) -> None:
    state = get_session(session_id)
    if not state or phase_id not in state.phases:
        return
    async with state._lock:
        phase = state.phases[phase_id]
        phase.progress = max(phase.progress, progress)
        if status:
            phase.status = status  # type: ignore[assignment]
            if status == "running" and phase.startedAt is None:
                phase.startedAt = datetime.utcnow().isoformat() + "Z"
            elif status in ("completed", "failed"):
                phase.completedAt = datetime.utcnow().isoformat() + "Z"


async def store_result(session_id: str, phase_id: str, data: Any) -> None:
    state = get_session(session_id)
    if not state or phase_id not in state.phases:
        return
    async with state._lock:
        state.phases[phase_id].result = data
