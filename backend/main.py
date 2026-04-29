"""
Travellin' Bedouin — FastAPI Backend
=====================================
Run:  uvicorn main:app --reload --port 8000
"""

import os
from dotenv import load_dotenv
load_dotenv()  # loads .env before any agent reads os.getenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.sessions import router as sessions_router
from routers.results import router as results_router

app = FastAPI(title="Travellin' Bedouin API", version="1.0.0")

# CORS — allow the Next.js frontend
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
app.include_router(results_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
