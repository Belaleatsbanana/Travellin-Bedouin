"""
Orchestrator
============
Manages the agent execution sequence:
  1. Budget Agent runs first
  2. On completion, the 4 downstream agents run in parallel

The Activities Agent is the only fully implemented agent here.
Budget / Visa / Accommodation / Transport stubs exist purely for
integration testing — replace them with your real implementations.
"""

from __future__ import annotations
import asyncio
import logging

from models.session import TripFormData
from storage import session_store as store

from agents.budget_agent import run_budget_agent
from agents.visa_agent import run_visa_agent
from agents.accommodation_agent import run_accommodation_agent
from agents.transport_agent import run_transport_agent
from agents.activities_agent import run_activities_agent

log = logging.getLogger(__name__)


async def run_all_agents(session_id: str, form_data: TripFormData) -> None:
    """
    Entry point called by the sessions router after creating a session.
    Runs inside a background asyncio task so the POST /api/sessions
    response returns immediately.
    """
    state = store.get_session(session_id)
    if not state:
        log.error("Session %s not found", session_id)
        return

    # ── Phase 1: Budget Agent ─────────────────────────────────────────────────
    try:
        budget_result = await run_budget_agent(session_id, form_data)
    except Exception as exc:
        log.exception("Budget agent failed: %s", exc)
        await store.update_progress(session_id, "budget", 100, "failed")
        state.overall_status = "failed"
        return

    # ── Phase 2: Downstream agents in parallel ────────────────────────────────
    breakdown = budget_result.get("breakdown", {})
    activities_budget = breakdown.get("activities", form_data.totalBudget * 0.20)
    accommodation_budget = breakdown.get("accommodation", form_data.totalBudget * 0.35)
    transport_budget = breakdown.get("transportation", form_data.totalBudget * 0.15)
    visa_budget = breakdown.get("visa_insurance", form_data.totalBudget * 0.05)

    results = await asyncio.gather(
        _safe_run(run_visa_agent, session_id, "visa_insurance", form_data, visa_budget),
        _safe_run(run_accommodation_agent, session_id, "accommodation", form_data, accommodation_budget),
        _safe_run(run_transport_agent, session_id, "transportation", form_data, transport_budget),
        _safe_run(run_activities_agent, session_id, "activities", form_data, activities_budget),
        return_exceptions=True,
    )

    for res in results:
        if isinstance(res, Exception):
            log.exception("Downstream agent raised: %s", res)

    # Sync overall status
    state_now = store.get_session(session_id)
    if state_now:
        if state_now.all_completed():
            state_now.overall_status = "completed"
        elif state_now.any_failed():
            state_now.overall_status = "failed"


async def _safe_run(fn, session_id: str, agent_id: str, form_data: TripFormData, budget: float):
    """Wrap an agent run; mark it failed on exception rather than crashing gather."""
    try:
        return await fn(session_id, form_data, budget)
    except Exception as exc:
        log.exception("Agent %s failed: %s", agent_id, exc)
        await store.update_progress(session_id, agent_id, 100, "failed")
        raise
