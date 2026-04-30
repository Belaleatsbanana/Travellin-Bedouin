"""
Budget Agent (stub)
===================
Distributes the traveler's total budget across 5 categories.
Replace this stub with a full LLM-powered implementation as needed.
"""

from __future__ import annotations
import asyncio
import os
import json

from groq import AsyncGroq

from models.session import TripFormData
from storage.session_store import emit_thought, store_result, update_progress

AGENT_ID = "budget"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Default allocation percentages
_DEFAULT_PCT = {
    "accommodation": 35,
    "transportation": 15,
    "activities": 20,
    "visa_insurance": 5,
    "contingency": 25,
}


async def run_budget_agent(session_id: str, form_data: TripFormData) -> dict:
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(session_id, AGENT_ID, f"Received total budget: {form_data.totalBudget} {form_data.currency}", "info")
    await asyncio.sleep(0.5)

    await update_progress(session_id, AGENT_ID, 30)
    await emit_thought(session_id, AGENT_ID, f"Looking up cost-of-living index for {form_data.destinationCity}...", "search")
    await asyncio.sleep(0.5)

    # Use LLM to determine smart percentages (or fall back to defaults)
    percentages = _DEFAULT_PCT.copy()
    try:
        groq = AsyncGroq(api_key=os.getenv("BUDGET_API_KEY") or os.getenv("GROQ_API_KEY", ""))
        prompt = (
            f"A traveler is going to {form_data.destinationCity}, {form_data.destinationCountry} "
            f"for {form_data.durationNights} nights with a total budget of "
            f"{form_data.totalBudget} {form_data.currency}. "
            f"Accommodation preference: {form_data.accommodationPreference}. "
            f"Transport preference: {form_data.transportPreference}. "
            f"Activity interests: {', '.join(form_data.activityCategories)}. "
            f"Suggest budget allocation percentages (must sum to 100) for: "
            f"accommodation, transportation, activities, visa_insurance, contingency. "
            f"Return ONLY a JSON object like: "
            f'{{ "accommodation": 35, "transportation": 15, "activities": 20, '
            f'"visa_insurance": 5, "contingency": 25 }}'
        )
        resp = await groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = json.loads(resp.choices[0].message.content or "{}")
        if all(k in raw for k in percentages):
            total = sum(raw[k] for k in percentages)
            if 95 <= total <= 105:
                # Normalize to exactly 100
                factor = 100 / total
                percentages = {k: round(v * factor) for k, v in raw.items() if k in percentages}
    except Exception:
        pass

    await update_progress(session_id, AGENT_ID, 60)
    await emit_thought(session_id, AGENT_ID, f"Allocating {percentages['accommodation']}% to accommodation", "decision")
    await emit_thought(session_id, AGENT_ID, f"Allocating {percentages['transportation']}% to transportation", "decision")
    await emit_thought(session_id, AGENT_ID, f"Allocating {percentages['activities']}% to activities", "decision")
    await asyncio.sleep(0.3)

    breakdown = {k: round(form_data.totalBudget * pct / 100, 2) for k, pct in percentages.items()}

    await update_progress(session_id, AGENT_ID, 90)
    await emit_thought(
        session_id, AGENT_ID,
        f"Budget distributed: accommodation {breakdown['accommodation']} | "
        f"transport {breakdown['transportation']} | "
        f"activities {breakdown['activities']} {form_data.currency}",
        "info",
    )

    result = {
        "totalBudget": form_data.totalBudget,
        "currency": form_data.currency,
        "breakdown": breakdown,
        "percentages": percentages,
    }
    await store_result(session_id, "budget", result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    return result
