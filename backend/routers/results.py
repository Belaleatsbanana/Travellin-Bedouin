from __future__ import annotations
from fastapi import APIRouter, HTTPException

from storage import session_store as store

router = APIRouter(prefix="/api/sessions", tags=["results"])


def _require_completed(session_id: str):
    state = store.get_session(session_id)
    if not state:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "session_not_found", "message": "Session not found"}},
        )
    return state


@router.get("/{session_id}/results/budget")
async def get_budget(session_id: str):
    state = _require_completed(session_id)
    data = state.results.get("budget")
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_ready", "message": "Budget result not yet available"}},
        )
    return data


@router.get("/{session_id}/results/visa")
async def get_visa(session_id: str):
    state = _require_completed(session_id)
    data = state.results.get("visa")
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_ready", "message": "Visa result not yet available"}},
        )
    return data


@router.get("/{session_id}/results/accommodation")
async def get_accommodation(session_id: str):
    state = _require_completed(session_id)
    data = state.results.get("accommodation")
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_ready", "message": "Accommodation result not yet available"}},
        )
    return data


@router.get("/{session_id}/results/transport")
async def get_transport(session_id: str):
    state = _require_completed(session_id)
    data = state.results.get("transport")
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_ready", "message": "Transport result not yet available"}},
        )
    return data


@router.get("/{session_id}/results/activities")
async def get_activities(session_id: str):
    state = _require_completed(session_id)
    data = state.results.get("activities")
    if data is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_ready", "message": "Activities result not yet available"}},
        )
    return data


@router.get("/{session_id}/results/full")
async def get_full(session_id: str):
    state = _require_completed(session_id)
    return {
        "sessionId": session_id,
        "formData": state.form_data.model_dump(),
        "budget": state.results.get("budget"),
        "visa": state.results.get("visa"),
        "accommodation": state.results.get("accommodation"),
        "transport": state.results.get("transport"),
        "activities": state.results.get("activities"),
    }
