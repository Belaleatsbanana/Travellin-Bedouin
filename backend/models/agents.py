from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


class AgentThought(BaseModel):
    timestamp: str
    message: str
    type: Literal["info", "search", "decision", "warning"]


class AgentState(BaseModel):
    agentId: str
    status: Literal["pending", "running", "completed", "failed"]
    progress: int = 0
    thoughts: list[AgentThought] = []
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
