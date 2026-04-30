"""
Transportation Agent
====================
Finds transportation options and generates per-day, per-leg transport suggestions
based on the confirmed accommodation and activity schedule.
"""

from __future__ import annotations
import asyncio
import json
import os

import groq as groq_sdk

from models.session import TripFormData
from agents.groq_client import groq_chat
from storage.session_store import emit_thought, store_result, update_progress

AGENT_ID = "transportation"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def run_transport_agent(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
    accommodation_context: dict | None = None,
    activities_context: dict | None = None,
    chat_history: list[dict] | None = None,
) -> dict:
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(session_id, AGENT_ID,
        f"Transport budget: {budget_allocated} {form_data.currency} for {form_data.durationNights} days", "info")
    await emit_thought(session_id, AGENT_ID,
        f"Searching transport options in {form_data.destinationCity} (preference: {form_data.transportPreference})...", "search")
    await asyncio.sleep(0.5)
    await update_progress(session_id, AGENT_ID, 30)

    # Build accommodation section
    acc_section = ""
    if accommodation_context:
        confirmed_opt = accommodation_context.get("confirmed_option") or (
            next(iter(accommodation_context.get("options", [])), None)
        )
        if confirmed_opt:
            loc = confirmed_opt.get("location", {})
            acc_section = (
                f"CONFIRMED ACCOMMODATION:\n"
                f"Hotel: {confirmed_opt.get('name')}, {loc.get('address', '')}\n"
                f"Coordinates: {loc.get('coordinates', {})}\n\n"
            )

    # Build activity schedule section
    schedule_section = ""
    if activities_context:
        schedule = activities_context.get("schedule", [])
        if schedule:
            lines = []
            for day in schedule:
                slots = day.get("slots", [])
                if slots:
                    slot_strs = [
                        f"  {s['startTime']}-{s['endTime']} {s['activityName']} @ {s['locationName']}"
                        for s in slots
                    ]
                    lines.append(f"Day {day['day']} ({day['date']}):\n" + "\n".join(slot_strs))
            if lines:
                schedule_section = "ACTIVITY SCHEDULE (generate transport legs between these):\n" + "\n".join(lines) + "\n\n"

    # Build chat refinement section
    chat_section = ""
    if chat_history:
        conv = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
for m in chat_history
        )
        chat_section = f"CONVERSATION HISTORY — apply user preferences:\n{conv}\n\n"

    await emit_thought(session_id, AGENT_ID,
        f"Analysing activity schedule to plan per-leg transport...", "decision")
    await update_progress(session_id, AGENT_ID, 55)

    prompt = (
        f"You are the Transportation Agent for a trip to {form_data.destinationCity}, {form_data.destinationCountry}.\n\n"
        f"{acc_section}"
        f"{schedule_section}"
        f"{chat_section}"
        f"TRIP DETAILS:\n"
        f"- Travelers: {form_data.travelers.adults} adults\n"
        f"- Duration: {form_data.durationNights} days\n"
        f"- Preference: {form_data.transportPreference}\n"
        f"- Budget: {budget_allocated} {form_data.currency}\n\n"
        "Return ONLY valid JSON with this exact structure:\n"
        "{\n"
        '  "budgetAllocated": <number>,\n'
        '  "currency": "<string>",\n'
        '  "recommendation": "<2-3 sentence summary>",\n'
        '  "options": {\n'
        '    "rental_car": [...],\n'
        '    "dedicated_driver": [...],\n'
        '    "metro_pass": [...],\n'
        '    "uber_estimate": [...],\n'
        '    "minibus": [...]\n'
        "  },\n"
        '  "dailyLegs": [\n'
        "    {\n"
        '      "day": 1, "date": "YYYY-MM-DD",\n'
        '      "legs": [\n'
        "        {\n"
        '          "fromTime": "HH:MM", "toTime": "HH:MM",\n'
        '          "fromLocationName": "<string>", "toLocationName": "<string>",\n'
        '          "mode": "uber|taxi|metro|walk|rental_car|bus|dedicated_driver",\n'
        '          "durationMinutes": <int>, "estimatedCost": <number>,\n'
        '          "currency": "<string>", "notes": "<string>"\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Each options category is an array of transport option objects: "
        "{ id, category, provider, description, priceTotal(number), currency, "
        "pricingModel('per_day'|'fixed'|'per_trip'|'per_person'), priceUnit(number), "
        "durationDays(int), features(array), recommended(bool), bookingUrl(string) }.\n"
        "Include at least 1 option per category. "
        "Set recommended:true on the best option matching the user preference.\n"
        "For dailyLegs: generate one leg for each gap between consecutive activity slots per day. "
        "Only include days that have activity slots. "
        "Use realistic local providers and accurate travel times. "
        "Return ONLY valid JSON, no markdown."
    )

    result: dict = {}
    try:
        await update_progress(session_id, AGENT_ID, 70)
        await emit_thought(session_id, AGENT_ID,
            f"Generating trip-wide options and per-day transport legs...", "decision")
        resp = await groq_chat(
            primary_key_env="TRANSPORTATION_API_KEY",
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content or "{}")
    except groq_sdk.RateLimitError as exc:
        print(f"[Transport Agent] RATE LIMIT: {exc}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"Groq rate limit hit — try again in a moment. ({exc})", "warning")
    except Exception as exc:
        await emit_thought(session_id, AGENT_ID, f"LLM error: {exc}", "warning")

    result.setdefault("budgetAllocated", budget_allocated)
    result.setdefault("currency", form_data.currency)
    result.setdefault("recommendation", f"Recommended transport for {form_data.destinationCity}.")
    result.setdefault("dailyLegs", [])
    opts = result.setdefault("options", {})
    for key in ("rental_car", "dedicated_driver", "metro_pass", "uber_estimate", "minibus"):
        opts.setdefault(key, [])

    await update_progress(session_id, AGENT_ID, 90)
    await emit_thought(session_id, AGENT_ID,
        f"Transport plan complete — {len(result.get('dailyLegs', []))} days with per-leg routes", "info")

    await store_result(session_id, AGENT_ID, result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    return result
