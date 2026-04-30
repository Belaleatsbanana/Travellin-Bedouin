from __future__ import annotations
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from agents.orchestrator import run_pipeline
from models.session import CreateSessionRequest
from storage import session_store as store

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", status_code=201)
async def create_session(body: CreateSessionRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    store.create_session(session_id, body.formData)
    background_tasks.add_task(run_pipeline, session_id, body.formData)
    return {
        "sessionId": session_id,
        "status": "initializing",
        "estimatedDurationSeconds": 45,
    }


@router.get("/{session_id}/status")
async def get_status(session_id: str):
    state = store.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail={"error": {"code": "session_not_found", "message": "Session not found"}})

    phases_payload = {}
    for phase_id, phase in state.phases.items():
        phases_payload[phase_id] = {
            "phaseId": phase_id,
            "status": phase.status,
            "progress": phase.progress,
            "thoughts": [t.model_dump() for t in phase.thoughts],
            "hasResult": phase.result is not None,
            "startedAt": phase.startedAt,
            "completedAt": phase.completedAt,
        }

    return {
        "sessionId": session_id,
        "overallStatus": state.overall_status,
        "currentPhase": state.current_phase,
        "phases": phases_payload,
    }
