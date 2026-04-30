"""
Orchestrator
============
Sequential pipeline: budget (hidden) → accommodation → activities → transportation.
Each phase pauses for user confirmation before the next begins.
Chat refinement regenerates the current phase with updated conversation history.
"""

from __future__ import annotations
import logging

from models.session import TripFormData
from storage import session_store as store

from agents.budget_agent import run_budget_agent
from agents.accommodation_agent import run_accommodation_agent
from agents.activities_agent import run_activities_agent
from agents.transport_agent import run_transport_agent

log = logging.getLogger(__name__)


async def run_pipeline(session_id: str, form_data: TripFormData) -> None:
    """
    Entry point after session creation. Runs budget agent (hidden), then
    kicks off accommodation phase. Subsequent phases are triggered by confirm_phase().
    """
    state = store.get_session(session_id)
    if not state:
        log.error("Session %s not found", session_id)
        return

    # ── Hidden budget calculation ─────────────────────────────────────────────
    try:
        budget_result = await run_budget_agent(session_id, form_data)
        state.budget_result = budget_result
    except Exception as exc:
        log.exception("Budget agent failed: %s", exc)
        budget_result = {}
        state.budget_result = {}

    # ── Start accommodation phase ─────────────────────────────────────────────
    state.current_phase = "accommodation"
    state.overall_status = "running"
    await _run_accommodation(session_id, chat_history=[])


async def confirm_phase(session_id: str, phase: str, selected_option_id: str | None) -> str | None:
    """
    Called when the user confirms a phase. Stores confirmed result, advances
    current_phase, and kicks off the next phase agent. Returns the next phase name.
    """
    state = store.get_session(session_id)
    if not state:
        return None

    phase_state = state.phases.get(phase)
    if not phase_state or phase_state.result is None:
        return None

    # Store confirmed result (optionally filter to selected option only)
    result = phase_state.result
    if selected_option_id and phase == "accommodation":
        options = result.get("options", [])
        selected = next((o for o in options if o.get("id") == selected_option_id), None)
        if selected:
            result = {**result, "confirmed_option": selected}

    if phase == "accommodation":
        state.confirmed_accommodation = result
        state.current_phase = "activities"
        phase_state.status = "confirmed"
        state.overall_status = "running"
        await _run_activities(session_id, chat_history=[])
        return "activities"

    elif phase == "activities":
        state.confirmed_activities = result
        state.current_phase = "transportation"
        phase_state.status = "confirmed"
        state.overall_status = "running"
        await _run_transportation(session_id, chat_history=[])
        return "transportation"

    elif phase == "transportation":
        state.confirmed_transport = result
        phase_state.status = "confirmed"
        state.current_phase = "done"
        state.overall_status = "done"
        return "done"

    return None


async def regen_phase(session_id: str, phase: str) -> None:
    """
    Regenerate a phase using the current chat_history (called after a new user message).
    """
    state = store.get_session(session_id)
    if not state:
        return

    phase_state = state.phases.get(phase)
    if not phase_state:
        return

    # Reset progress for re-run
    phase_state.status = "running"
    phase_state.progress = 0
    phase_state.thoughts = []
    state.overall_status = "running"

    chat_history = [{"role": m.role, "content": m.content} for m in phase_state.chat_history]

    if phase == "accommodation":
        await _run_accommodation(session_id, chat_history=chat_history)
    elif phase == "activities":
        await _run_activities(session_id, chat_history=chat_history)
    elif phase == "transportation":
        await _run_transportation(session_id, chat_history=chat_history)


# ─── Internal phase runners ────────────────────────────────────────────────────

def _budget_for(state, key: str, fallback_pct: float) -> float:
    breakdown = (state.budget_result or {}).get("breakdown", {})
    return breakdown.get(key, state.form_data.totalBudget * fallback_pct)


async def _run_accommodation(session_id: str, chat_history: list[dict]) -> None:
    state = store.get_session(session_id)
    if not state:
        return
    budget = _budget_for(state, "accommodation", 0.35)
    try:
        await run_accommodation_agent(session_id, state.form_data, budget, chat_history=chat_history)
        state.overall_status = "awaiting_confirmation"
    except Exception as exc:
        log.exception("Accommodation agent failed: %s", exc)
        state.phases["accommodation"].status = "failed"
        state.overall_status = "failed"


async def _run_activities(session_id: str, chat_history: list[dict]) -> None:
    state = store.get_session(session_id)
    if not state:
        return
    budget = _budget_for(state, "activities", 0.20)
    try:
        await run_activities_agent(
            session_id, state.form_data, budget,
            accommodation_context=state.confirmed_accommodation,
            chat_history=chat_history,
        )
        state.overall_status = "awaiting_confirmation"
    except Exception as exc:
        log.exception("Activities agent failed: %s", exc)
        state.phases["activities"].status = "failed"
        state.overall_status = "failed"


async def _run_transportation(session_id: str, chat_history: list[dict]) -> None:
    state = store.get_session(session_id)
    if not state:
        return
    budget = _budget_for(state, "transportation", 0.15)
    try:
        await run_transport_agent(
            session_id, state.form_data, budget,
            accommodation_context=state.confirmed_accommodation,
            activities_context=state.confirmed_activities,
            chat_history=chat_history,
        )
        state.overall_status = "awaiting_confirmation"
    except Exception as exc:
        log.exception("Transport agent failed: %s", exc)
        state.phases["transportation"].status = "failed"
        state.overall_status = "failed"
