"""
storage/session_store.py
Thread-safe in-memory session store (dict-backed for MVP).
Swap the implementation for Redis to support multi-process / production deploys.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

from models.session import SessionState


# ---------------------------------------------------------------------------
# Module-level store + lock
# ---------------------------------------------------------------------------

_sessions: Dict[str, SessionState] = {}
_lock = asyncio.Lock()

SESSION_TTL_SECONDS: int = 86_400  # 24 hours


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def create_session(session: SessionState) -> None:
    async with _lock:
        _sessions[session.sessionId] = session


async def get_session(session_id: str) -> Optional[SessionState]:
    async with _lock:
        return _sessions.get(session_id)


async def update_session(session: SessionState) -> None:
    async with _lock:
        _sessions[session.sessionId] = session


async def delete_session(session_id: str) -> None:
    async with _lock:
        _sessions.pop(session_id, None)


async def session_exists(session_id: str) -> bool:
    async with _lock:
        return session_id in _sessions


# ---------------------------------------------------------------------------
# Expiry helper (call from a background task or startup event)
# ---------------------------------------------------------------------------

async def purge_expired_sessions() -> int:
    """Remove sessions older than SESSION_TTL_SECONDS. Returns count removed."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=SESSION_TTL_SECONDS)
    to_remove = []
    async with _lock:
        for sid, state in _sessions.items():
            try:
                created = datetime.fromisoformat(state.createdAt)
                if created < cutoff:
                    to_remove.append(sid)
            except (ValueError, TypeError):
                pass  # malformed timestamp — leave it in place
        for sid in to_remove:
            del _sessions[sid]
    return len(to_remove)
