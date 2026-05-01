from __future__ import annotations
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from agents.orchestrator import confirm_phase as do_confirm, regen_phase
from models.session import ChatRequest, ConfirmRequest
from storage import session_store as store

router = APIRouter(prefix="/api/sessions", tags=["pipeline"])

VALID_PHASES = {"accommodation", "activities", "transportation"}


def _require_phase(session_id: str, phase: str):
    if phase not in VALID_PHASES:
        raise HTTPException(status_code=400, detail={"error": {"code": "invalid_phase", "message": f"Unknown phase: {phase}"}})
    state = store.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail={"error": {"code": "session_not_found", "message": "Session not found"}})
    phase_state = state.phases.get(phase)
    if not phase_state:
        raise HTTPException(status_code=404, detail={"error": {"code": "phase_not_found", "message": "Phase not found"}})
    return state, phase_state


@router.get("/{session_id}/phase/{phase}/result")
async def get_phase_result(session_id: str, phase: str):
    state, phase_state = _require_phase(session_id, phase)
    if phase_state.result is None:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_ready", "message": "Phase result not yet available"}})
    return phase_state.result


@router.post("/{session_id}/phase/{phase}/chat")
async def chat_with_phase(
    session_id: str,
    phase: str,
    body: ChatRequest,
    background_tasks: BackgroundTasks,
):
    state, phase_state = _require_phase(session_id, phase)
    if state.current_phase != phase:
        raise HTTPException(status_code=400, detail={"error": {"code": "wrong_phase", "message": f"Current phase is {state.current_phase}"}})

    # Append user message
    from models.session import ChatMessage
    now = datetime.utcnow().isoformat() + "Z"
    phase_state.chat_history.append(ChatMessage(role="user", content=body.message, timestamp=now))

    # Add assistant acknowledgement
    phase_state.chat_history.append(ChatMessage(
        role="assistant",
        content=f"Got it — updating recommendations based on your request.",
        timestamp=now,
    ))

    background_tasks.add_task(regen_phase, session_id, phase)
    return {"status": "regenerating", "message": "Agent is updating recommendations..."}


@router.post("/{session_id}/phase/{phase}/confirm")
async def confirm_phase_endpoint(
    session_id: str,
    phase: str,
    body: ConfirmRequest,
    background_tasks: BackgroundTasks,
):
    state, phase_state = _require_phase(session_id, phase)
    if phase_state.status not in ("completed", "confirmed"):
        raise HTTPException(status_code=400, detail={"error": {"code": "not_ready", "message": "Phase not yet completed"}})
    if state.current_phase != phase:
        raise HTTPException(status_code=400, detail={"error": {"code": "wrong_phase", "message": f"Current phase is {state.current_phase}"}})

    next_phase = await do_confirm(session_id, phase, body.selectedOptionId)

    # The confirm runs the next phase in background — the client polls status
    return {"confirmedPhase": phase, "nextPhase": next_phase}


@router.get("/{session_id}/results/full")
async def get_full_results(session_id: str):
    state = store.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail={"error": {"code": "session_not_found", "message": "Session not found"}})
    if state.overall_status != "done":
        raise HTTPException(status_code=400, detail={"error": {"code": "not_ready", "message": "Pipeline not yet complete"}})

    acc = state.confirmed_accommodation or {}
    acts = state.confirmed_activities or {}
    transport = state.confirmed_transport or {}

    # Compute actual confirmed costs
    confirmed_option = acc.get("confirmed_option") or next(iter(acc.get("options", [])), {})
    acc_total = confirmed_option.get("totalPrice", acc.get("budgetAllocated", 0))

    activities_list = acts.get("activities", [])
    num_travelers = (
        state.form_data.travelers.adults
        + state.form_data.travelers.children
        + state.form_data.travelers.seniors
    )
    acts_total = sum(
        a.get("price", 0) * (num_travelers if a.get("priceType") == "per_person" else 1)
        for a in activities_list
        if a.get("price", 0) > 0
    )

    transport_opts = transport.get("options", {})
    all_opts = [o for cat in transport_opts.values() for o in cat]
    recommended_transport = next((o for o in all_opts if o.get("recommended")), None)
    transport_total = recommended_transport.get("priceTotal", transport.get("budgetAllocated", 0)) if recommended_transport else transport.get("budgetAllocated", 0)

    return {
        "sessionId": session_id,
        "formData": state.form_data.model_dump(),
        "budget": {
            "totalBudget": state.form_data.totalBudget,
            "currency": state.form_data.currency,
            "accommodationTotal": acc_total,
            "activitiesTotal": round(acts_total, 2),
            "transportTotal": transport_total,
        },
        "accommodation": acc,
        "activities": acts,
        "transport": transport,
    }
