"""
Transportation Agent (stub)
============================
Finds transportation options for the trip duration.
"""

from __future__ import annotations
import asyncio
import json
import os

from groq import AsyncGroq

from models.session import TripFormData
from storage.session_store import emit_thought, store_result, update_progress

AGENT_ID = "transportation"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def run_transport_agent(
    session_id: str, form_data: TripFormData, budget_allocated: float
) -> dict:
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(session_id, AGENT_ID, f"Transport budget: {budget_allocated} {form_data.currency} for {form_data.durationNights} days", "info")
    await emit_thought(session_id, AGENT_ID, f"Searching transport options in {form_data.destinationCity} (preference: {form_data.transportPreference})...", "search")
    await asyncio.sleep(0.9)
    await update_progress(session_id, AGENT_ID, 35)

    groq = AsyncGroq(api_key=os.getenv("TRANSPORTATION_API_KEY") or os.getenv("GROQ_API_KEY", ""))
    prompt = (
        f"Find transport options for {form_data.travelers.adults} adults in "
        f"{form_data.destinationCity}, {form_data.destinationCountry} "
        f"for {form_data.durationNights} days. "
        f"Preference: {form_data.transportPreference}. "
        f"Budget: {budget_allocated} {form_data.currency}. "
        "Return a JSON object with: budgetAllocated(number), currency(string), "
        "recommendation(string), options(object with keys: rental_car, dedicated_driver, "
        "metro_pass, uber_estimate, minibus — each is an array). "
        "Each transport option: { id, category, provider, description, priceTotal(number), "
        "currency, pricingModel('per_day'|'fixed'|'per_trip'|'per_person'), priceUnit(number), "
        "durationDays(int), features(array), recommended(bool), bookingUrl(string) }. "
        "Include at least 1 option per category. Set recommended:true on the best option "
        "matching the user's preference. Use realistic local providers. Return ONLY valid JSON."
    )

    result: dict = {}
    try:
        await update_progress(session_id, AGENT_ID, 60)
        await emit_thought(session_id, AGENT_ID, f"Comparing {form_data.transportPreference} options by total cost and convenience", "decision")
        resp = await groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content or "{}")
    except Exception as exc:
        await emit_thought(session_id, AGENT_ID, f"LLM error: {exc}", "warning")

    result.setdefault("budgetAllocated", budget_allocated)
    result.setdefault("currency", form_data.currency)
    result.setdefault("recommendation", f"Recommended transport for {form_data.destinationCity}.")
    opts = result.setdefault("options", {})
    for key in ("rental_car", "dedicated_driver", "metro_pass", "uber_estimate", "minibus"):
        opts.setdefault(key, [])

    await update_progress(session_id, AGENT_ID, 85)
    await emit_thought(session_id, AGENT_ID, f"Pricing model analysis complete — best value within {budget_allocated} {form_data.currency}", "info")

    await store_result(session_id, "transport", result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    return result
