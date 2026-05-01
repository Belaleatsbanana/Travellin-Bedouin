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

import httpx
import groq as groq_sdk

from models.session import TripFormData
from agents.groq_client import groq_chat
from storage.session_store import emit_thought, store_result, update_progress

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

AGENT_ID = "transportation"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def _fetch_route_data(schedule: list[dict]) -> dict[str, dict]:
    """
    Call the Routes API (New) for each consecutive activity pair per day.
    Returns a dict keyed by "fromLocation → toLocation" with real duration/distance.
    """
    if not GOOGLE_MAPS_API_KEY or not schedule:
        return {}

    route_data: dict[str, dict] = {}

    async with httpx.AsyncClient() as client:
        for day in schedule:
            slots = day.get("slots", [])
            for i in range(len(slots) - 1):
                from_slot = slots[i]
                to_slot = slots[i + 1]
                from_coords = from_slot.get("coordinates") or {}
                to_coords = to_slot.get("coordinates") or {}

                if not (from_coords.get("lat") and to_coords.get("lat")):
                    continue

                key = f"{from_slot['locationName']} → {to_slot['locationName']}"
                print(
                    f"[Transport] Routes API: {from_slot['locationName']!r} → "
                    f"{to_slot['locationName']!r}",
                    flush=True,
                )
                try:
                    resp = await client.post(
                        "https://routes.googleapis.com/directions/v2:computeRoutes",
                        json={
                            "origin": {
                                "location": {
                                    "latLng": {
                                        "latitude": from_coords["lat"],
                                        "longitude": from_coords["lng"],
                                    }
                                }
                            },
                            "destination": {
                                "location": {
                                    "latLng": {
                                        "latitude": to_coords["lat"],
                                        "longitude": to_coords["lng"],
                                    }
                                }
                            },
                            "travelMode": "DRIVE",
                        },
                        headers={
                            "Content-Type": "application/json",
                            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
                        },
                        timeout=10.0,
                    )
                    print(
                        f"[Transport] Routes API response: status={resp.status_code}",
                        flush=True,
                    )
                    if resp.status_code == 200:
                        routes = resp.json().get("routes", [])
                        if routes:
                            duration_str = routes[0].get("duration", "0s")
                            duration_sec = int(duration_str.rstrip("s"))
                            distance_m = routes[0].get("distanceMeters", 0)
                            route_data[key] = {
                                "duration_minutes": duration_sec // 60,
                                "distance_km": round(distance_m / 1000, 1),
                            }
                            print(
                                f"[Transport] Route OK: {duration_sec // 60} min, "
                                f"{round(distance_m / 1000, 1)} km",
                                flush=True,
                            )
                    else:
                        print(
                            f"[Transport] Routes API error: {resp.text[:300]}",
                            flush=True,
                        )
                except Exception as exc:
                    print(
                        f"[Transport] Routes API ERROR: {type(exc).__name__}: {exc}",
                        flush=True,
                    )

    return route_data


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

    # ── Fetch real route distances ──────────────────────────────────────────
    route_data: dict[str, dict] = {}
    if activities_context:
        schedule_for_routes = activities_context.get("schedule", [])
        if schedule_for_routes:
            await emit_thought(session_id, AGENT_ID, "Fetching real distances between activity locations...", "search")
            route_data = await _fetch_route_data(schedule_for_routes)
            await emit_thought(
                session_id, AGENT_ID,
                f"Distance Matrix: got real routes for {len(route_data)} location pairs",
                "info",
            )

    route_section = ""
    if route_data:
        route_lines = "\n".join(
            f"  {pair}: {data['duration_minutes']} min, {data['distance_km']} km"
            for pair, data in route_data.items()
        )
        route_section = f"REAL ROUTE DATA (use these exact durations in dailyLegs):\n{route_lines}\n\n"

    await emit_thought(session_id, AGENT_ID,
        f"Analysing activity schedule to plan per-leg transport...", "decision")
    await update_progress(session_id, AGENT_ID, 55)

    prompt = (
        f"You are the Transportation Agent for a trip to {form_data.destinationCity}, {form_data.destinationCountry}.\n\n"
        f"{acc_section}"
        f"{schedule_section}"
        f"{chat_section}"
        f"{route_section}"
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
        "Include at least 3 options per category (different providers/price points). "
        "Set recommended:true on the best option matching the user preference.\n"
        "For dailyLegs: generate one leg for each gap between consecutive activity slots per day. "
        "Only include days that have activity slots. "
        "Use realistic local providers. Where REAL ROUTE DATA is provided above, use those exact durationMinutes values. "
        "Return ONLY valid JSON, no markdown."
    )

    result: dict = {}
    try:
        await update_progress(session_id, AGENT_ID, 70)
        await emit_thought(session_id, AGENT_ID,
            f"Generating trip-wide options and per-day transport legs...", "decision")
        print(
            f"[Transport] groq_chat request: model={GROQ_MODEL} prompt_len={len(prompt)} chars",
            flush=True,
        )
        resp = await groq_chat(
            primary_key_env="TRANSPORTATION_API_KEY",
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4500,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        print(f"[Transport] groq_chat response: {len(raw)} chars", flush=True)
        result = json.loads(raw)
        print(
            f"[Transport] parsed result keys={list(result.keys())} "
            f"daily_legs={len(result.get('dailyLegs', []))} "
            f"options_categories={list(result.get('options', {}).keys())}",
            flush=True,
        )
    except groq_sdk.RateLimitError as exc:
        print(f"[Transport Agent] RATE LIMIT: {exc}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"Groq rate limit hit — try again in a moment. ({exc})", "warning")
    except Exception as exc:
        print(f"[Transport] ERROR: {type(exc).__name__}: {exc}", flush=True)
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
