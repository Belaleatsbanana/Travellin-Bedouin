"""
Travellin' Bedouin — FastAPI Backend
=====================================
Run:  uvicorn main:app --reload --port 8000
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Support running from backend/ dir directly (local dev) or from project root (Docker).
# Try backend/.env first, then project root .env.
_here = Path(__file__).parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.sessions import router as sessions_router
from routers.pipeline import router as pipeline_router

app = FastAPI(title="Travellin' Bedouin API", version="2.0.0")

_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(pipeline_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
