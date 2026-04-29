"""
Accommodation Agent (stub)
==========================
Finds accommodation options matching the traveler's preferences and budget.
"""

from __future__ import annotations
import asyncio
import json
import os

from groq import AsyncGroq

from models.session import TripFormData
from storage.session_store import emit_thought, store_result, update_progress

AGENT_ID = "accommodation"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def run_accommodation_agent(
    session_id: str, form_data: TripFormData, budget_allocated: float
) -> dict:
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(session_id, AGENT_ID, f"Budget allocated: {budget_allocated} {form_data.currency} for {form_data.durationNights} nights", "info")
    await emit_thought(session_id, AGENT_ID, f"Searching {form_data.accommodationPreference} options in {form_data.destinationCity}...", "search")
    await asyncio.sleep(1.0)
    await update_progress(session_id, AGENT_ID, 30)

    price_per_night = budget_allocated / max(form_data.durationNights, 1)

    groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY", ""))
    prompt = (
        f"Find 3 accommodation options in {form_data.destinationCity}, {form_data.destinationCountry} "
        f"for {form_data.travelers.adults} adults, {form_data.durationNights} nights "
        f"({form_data.departureDate} to {form_data.returnDate}). "
        f"Preference: {form_data.accommodationPreference}. "
        f"Budget: {budget_allocated} {form_data.currency} total "
        f"(~{price_per_night:.0f} {form_data.currency}/night). "
        "Return a JSON object with keys: budgetAllocated (number), currency (string), "
        "recommendation (string), options (array of 3 objects). "
        "Each option: { id(string like acc-001), name, type('hotel'|'apartment'|'chalet'|'villa'), "
        "starRating(1-5), pricePerNight(number), totalPrice(number), currency, "
        "location: { address, distanceFromCenter(number km), coordinates: { lat, lng } }, "
        "amenities(array), images(array of 1 Unsplash URL), bookingUrl(string), "
        "rating(7.0-9.5), reviewCount(number), recommended(bool) }. "
        "Make the first option 'recommended: true', others false. "
        "Use realistic hotel names and Unsplash image URLs. Return ONLY valid JSON."
    )

    result: dict = {}
    try:
        await update_progress(session_id, AGENT_ID, 55)
        await emit_thought(session_id, AGENT_ID, f"Filtering by price: max {price_per_night:.0f} {form_data.currency}/night", "decision")
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
    result.setdefault("recommendation", f"We found top-rated {form_data.accommodationPreference} options in {form_data.destinationCity}.")
    result.setdefault("options", [])

    await update_progress(session_id, AGENT_ID, 85)
    top = next((o["name"] for o in result.get("options", []) if o.get("recommended")), "")
    if top:
        await emit_thought(session_id, AGENT_ID, f"Top pick: {top} — best value for budget", "decision")
    await emit_thought(session_id, AGENT_ID, f"Found {len(result.get('options', []))} accommodation options within budget", "info")

    await store_result(session_id, "accommodation", result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    return result
