from __future__ import annotations
import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from agents.orchestrator import run_all_agents
from models.session import CreateSessionRequest
from storage import session_store as store

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", status_code=201)
async def create_session(body: CreateSessionRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    store.create_session(session_id, body.formData)
    background_tasks.add_task(run_all_agents, session_id, body.formData)
    return {
        "sessionId": session_id,
        "status": "initializing",
        "estimatedDurationSeconds": 35,
    }


@router.get("/{session_id}/status")
async def get_status(session_id: str):
    state = store.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail={"error": {"code": "session_not_found", "message": "Session not found"}})

    agents_payload = {}
    for aid, agent in state.agents.items():
        agents_payload[aid] = {
            "agentId": agent.agentId,
            "status": agent.status,
            "progress": agent.progress,
            "thoughts": [t.model_dump() for t in agent.thoughts],
            "startedAt": agent.startedAt,
            "completedAt": agent.completedAt,
        }

    return {
        "sessionId": session_id,
        "overallStatus": state.overall_status,
        "agents": agents_payload,
    }


@router.post("/{session_id}/retry")
async def retry_session(session_id: str, background_tasks: BackgroundTasks):
    state = store.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail={"error": {"code": "session_not_found", "message": "Session not found"}})

    # Reset only failed agents
    for aid, agent in state.agents.items():
        if agent.status == "failed":
            agent.status = "pending"
            agent.progress = 0
            agent.thoughts = []
            agent.startedAt = None
            agent.completedAt = None

    state.overall_status = "running"
    background_tasks.add_task(run_all_agents, session_id, state.form_data)
    return {"sessionId": session_id, "status": "retrying", "estimatedDurationSeconds": 35}
