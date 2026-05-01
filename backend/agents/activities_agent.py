"""
Activities Agent
================
Discovers activities near the confirmed hotel using Google Maps Places API,
then uses Groq LLM to curate them into a day-by-day itinerary.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import traceback
from datetime import datetime, timedelta
from typing import Any

import httpx
import groq as groq_sdk

from models.results import ActivitiesResult
from models.session import TripFormData
from agents.groq_client import groq_chat
from storage.session_store import emit_thought, store_result, update_progress

# ─── Configuration ────────────────────────────────────────────────────────────

GROQ_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
AGENT_ID = "activities"
MAX_TOKENS_FINAL = 16000

# Maps user preference categories → Google Places API types
_CATEGORY_PLACE_TYPES: dict[str, list[str]] = {
    "culture":   ["museum", "art_gallery", "place_of_worship"],
    "food":      ["restaurant", "cafe", "bakery"],
    "nature":    ["park", "zoo", "aquarium"],
    "adventure": ["amusement_park", "stadium"],
    "nightlife": ["night_club", "bar"],
    "shopping":  ["shopping_mall", "clothing_store"],
    "wellness":  ["spa", "gym"],
    "sports":    ["stadium", "gym"],
    "art":       ["art_gallery", "museum"],
    "history":   ["museum", "church"],
    "beach":     ["natural_feature", "park"],
}


# ─── Google Maps Nearby Search (New) ─────────────────────────────────────────

_NEARBY_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.rating,places.userRatingCount,places.types,"
    "places.primaryType,places.location"
)


async def _search_places_for_categories(
    lat: float,
    lng: float,
    categories: list[str],
    radius: int = 10000,
) -> list[dict[str, Any]]:
    """Call Nearby Search (New) REST API for each preference category."""
    if not GOOGLE_MAPS_API_KEY:
        print("[Activities] Google Maps API key not set — skipping Places search", flush=True)
        return []

    seen_ids: set[str] = set()
    all_places: list[dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for category in categories:
            place_types = _CATEGORY_PLACE_TYPES.get(category, ["tourist_attraction"])
            for place_type in place_types[:2]:
                print(
                    f"[Activities] Nearby Search (New): type={place_type!r} "
                    f"category={category!r} lat={lat:.4f} lng={lng:.4f} radius={radius}",
                    flush=True,
                )
                try:
                    resp = await client.post(
                        "https://places.googleapis.com/v1/places:searchNearby",
                        json={
                            "includedTypes": [place_type],
                            "maxResultCount": 10,
                            "locationRestriction": {
                                "circle": {
                                    "center": {"latitude": lat, "longitude": lng},
                                    "radius": float(radius),
                                }
                            },
                        },
                        headers={
                            "Content-Type": "application/json",
                            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                            "X-Goog-FieldMask": _NEARBY_FIELD_MASK,
                        },
                        timeout=10.0,
                    )
                    print(
                        f"[Activities] Nearby Search response: status={resp.status_code}",
                        flush=True,
                    )
                    if resp.status_code == 200:
                        places = resp.json().get("places", [])
                        print(f"[Activities] Got {len(places)} places for type={place_type!r}", flush=True)
                        for place in places:
                            pid = place.get("id", "")
                            if pid in seen_ids:
                                continue
                            seen_ids.add(pid)
                            loc = place.get("location", {})
                            all_places.append({
                                "name": place.get("displayName", {}).get("text", ""),
                                "address": place.get("formattedAddress", ""),
                                "rating": place.get("rating", 0),
                                "review_count": place.get("userRatingCount", 0),
                                "types": place.get("types", []),
                                "primary_type": place.get("primaryType", ""),
                                "category": category,
                                "coordinates": {
                                    "lat": loc.get("latitude"),
                                    "lng": loc.get("longitude"),
                                },
                            })
                    else:
                        print(
                            f"[Activities] Nearby Search error: {resp.text[:300]}",
                            flush=True,
                        )
                except Exception as exc:
                    print(
                        f"[Activities] Nearby Search ERROR type={place_type!r}: "
                        f"{type(exc).__name__}: {exc}",
                        flush=True,
                    )

    print(f"[Activities] Total unique places collected: {len(all_places)}", flush=True)
    return all_places


# ─── JSON helpers ─────────────────────────────────────────────────────────────

def _extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("{"):
        return text
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE)
    start = text.find("{")
    if start == -1:
        return text
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return text[start:]


def _patch_result(raw: dict, form_data: TripFormData, budget: float) -> dict:
    raw.setdefault("budgetAllocated", budget)
    raw.setdefault("currency", form_data.currency)
    raw.setdefault("recommendation", f"Explore the best of {form_data.destinationCity}.")
    raw.setdefault("activities", [])
    raw.setdefault("schedule", [])

    if not raw["schedule"]:
        try:
            departure = datetime.strptime(form_data.departureDate, "%Y-%m-%d")
        except Exception:
            departure = datetime.utcnow()
        raw["schedule"] = [
            {
                "day": d,
                "date": (departure + timedelta(days=d - 1)).strftime("%Y-%m-%d"),
                "slots": [],
                "freeTime": "Free day — explore at your own pace",
            }
            for d in range(1, form_data.durationNights + 1)
        ]

    for i, act in enumerate(raw.get("activities", []), 1):
        act.setdefault("id", f"act-{i:03d}")
        act.setdefault("name", f"Activity {i}")
        act.setdefault("category", (form_data.activityCategories or ["culture"])[0])
        act.setdefault("description", "")
        act.setdefault("duration", "half_day")
        act.setdefault("price", 0)
        act.setdefault("priceType", "per_person")
        act.setdefault("currency", form_data.currency)
        act.setdefault("location", form_data.destinationCity)
        act.setdefault("rating", 8.0)
        act.setdefault("reviewCount", 0)
        act.setdefault("included", [])
        act.setdefault("recommended", i <= 2)
        act.setdefault("bookingUrl", "")
        act.setdefault("meetingPoint", "")

    return raw


# ─── Main entry point ─────────────────────────────────────────────────────────

async def run_activities_agent(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
    accommodation_context: dict | None = None,
    chat_history: list[dict] | None = None,
) -> dict:
    try:
        return await _run(session_id, form_data, budget_allocated, accommodation_context, chat_history or [])
    except Exception as exc:
        print(f"\n[Activities Agent FATAL ERROR]\n{traceback.format_exc()}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"Agent error: {exc}", "warning")
        fallback = _patch_result({}, form_data, budget_allocated)
        try:
            await store_result(session_id, AGENT_ID, fallback)
        except Exception:
            pass
        await update_progress(session_id, AGENT_ID, 100, "failed")
        return fallback


async def _run(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
    accommodation_context: dict | None = None,
    chat_history: list[dict] | None = None,
) -> dict:
    num_travelers = (
        form_data.travelers.adults
        + form_data.travelers.children
        + form_data.travelers.seniors
    )
    slots_per_day = 2  # equal activities per day

    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(
        session_id, AGENT_ID,
        f"Activities budget: {budget_allocated:.0f} {form_data.currency} "
        f"for {form_data.durationNights} days in {form_data.destinationCity}",
        "info",
    )
    await emit_thought(
        session_id, AGENT_ID,
        f"Preferences: {', '.join(form_data.activityCategories)}",
        "search",
    )

    # ── Get hotel coordinates ─────────────────────────────────────────────────
    hotel_lat: float | None = None
    hotel_lng: float | None = None
    hotel_name = form_data.destinationCity

    if accommodation_context:
        confirmed = accommodation_context.get("confirmed_option") or (
            next(iter(accommodation_context.get("options", [])), None)
        )
        if confirmed:
            coords = confirmed.get("location", {}).get("coordinates", {})
            hotel_lat = coords.get("lat")
            hotel_lng = coords.get("lng")
            hotel_name = confirmed.get("name", hotel_name)

    # ── Phase A: Google Maps Places search ───────────────────────────────────
    await update_progress(session_id, AGENT_ID, 15)
    await emit_thought(
        session_id, AGENT_ID,
        f"Searching Google Maps for activities near {hotel_name}...",
        "search",
    )

    places_data: list[dict] = []

    if hotel_lat is not None and hotel_lng is not None:
        places_data = await _search_places_for_categories(
            hotel_lat,
            hotel_lng,
            list(form_data.activityCategories),
        )
        await emit_thought(
            session_id, AGENT_ID,
            f"Found {len(places_data)} places across {len(form_data.activityCategories)} preference categories",
            "info",
        )
    else:
        await emit_thought(
            session_id, AGENT_ID,
            "No hotel coordinates available — using LLM knowledge of destination",
            "warning",
        )

    await update_progress(session_id, AGENT_ID, 45)

    # ── Phase B: LLM curation ─────────────────────────────────────────────────
    await emit_thought(session_id, AGENT_ID, "Curating activities and building equal daily schedule...", "decision")

    spendable = round(budget_allocated * 0.80, 2)
    categories_str = ", ".join(form_data.activityCategories)

    # Accommodation section
    acc_section = ""
    if accommodation_context:
        confirmed = accommodation_context.get("confirmed_option") or (
            next(iter(accommodation_context.get("options", [])), None)
        )
        if confirmed:
            loc = confirmed.get("location", {})
            coords = loc.get("coordinates", {})
            acc_section = (
                f"\nHOTEL BASE:\n"
                f"Name: {confirmed.get('name', 'Hotel')}\n"
                f"Address: {loc.get('address', '')}\n"
                f"Coordinates: lat={coords.get('lat', '')}, lng={coords.get('lng', '')}\n"
                f"All daily schedules start and end here.\n"
            )

    # Chat section
    chat_section = ""
    if chat_history:
        conv = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in chat_history
        )
        chat_section = (
            f"\nCONVERSATION HISTORY — apply user preferences strictly:\n{conv}\n"
        )

    # Places data section
    if places_data:
        places_section = (
            f"PLACES FROM GOOGLE MAPS (use these as primary source):\n"
            + json.dumps(places_data, indent=2)
            + "\n\n"
        )
    else:
        places_section = "No live places data — use your knowledge of the destination.\n\n"

    system_instructions = (
        "You are a travel activities curator. Return ONLY a valid JSON object — no markdown, no explanation.\n\n"
        "Required JSON fields:\n"
        "- budgetAllocated: number\n"
        "- currency: string\n"
        "- recommendation: string (2-3 sentences)\n"
        "- activities: array of activity objects\n"
        "- schedule: array of day objects\n\n"
        "Each activity object: id (act-001...), name, category, description, "
        "duration (half_day/full_day/evening/multi_day), price (number), priceType (per_person/per_group), "
        "currency, location (string address), coordinates ({lat, lng}), rating (float), reviewCount (int), "
        "included (array), meetingPoint (str), bookingUrl (str), recommended (bool), dayRecommended (int).\n\n"
        "Each schedule day: day (int), date (YYYY-MM-DD), freeTime (str), slots (array).\n"
        "Each slot: startTime (HH:MM), endTime (HH:MM), type='activity', "
        "activityId, activityName, locationName, coordinates ({lat, lng}).\n\n"
        "RULES:\n"
        f"- Schedule must cover ALL {'{num_days}'} trip days exactly.\n"
        f"- EVERY day must have EXACTLY {'{slots_per_day}'} activity slots — distribute evenly, no day gets more or fewer.\n"
        "- Every activityId in a slot MUST exist in the activities array.\n"
        "- Total activities array: 30-40 items (rich catalogue). Vary categories broadly.\n"
        "- At least 6 FREE (price=0) activities.\n"
        "- Prioritize GOOGLE MAPS places data over LLM-invented places. Use real names/addresses/coordinates.\n"
        "- User preferences must be honoured — pick activities matching: {categories}.\n"
        "- Allow 20-30 min travel gaps between slots.\n"
        "- First slot no earlier than 08:00. Last slot ends by 22:00.\n"
        "- full_day ~6h, half_day ~3h, evening ~2h.\n"
        "- recommended=true for top 5 picks.\n"
        "- Do NOT include an images field."
    ).replace("{num_days}", str(form_data.durationNights)).replace("{slots_per_day}", str(slots_per_day)).replace("{categories}", categories_str)

    user_prompt = (
        f"Plan activities for: {form_data.destinationCity}, {form_data.destinationCountry}\n"
        f"Dates: {form_data.departureDate} to {form_data.returnDate} ({form_data.durationNights} nights)\n"
        f"Travelers: {num_travelers}\n"
        f"Budget: {budget_allocated} {form_data.currency} total, {spendable} {form_data.currency} spendable\n"
        f"User preferences: {categories_str}\n"
        f"{acc_section}"
        f"{places_section}"
        f"{chat_section}"
        f"Produce the complete JSON. EVERY day must have EXACTLY {slots_per_day} slots. "
        f"Use Google Maps places data as the primary source for activity names and coordinates."
    )

    await update_progress(session_id, AGENT_ID, 60)

    try:
        response = await groq_chat(
            primary_key_env="ACTIVITY_API_KEY",
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=MAX_TOKENS_FINAL,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        final_text = response.choices[0].message.content or ""
        print(f"[Activities Agent] LLM responded ({len(final_text)} chars)", flush=True)
    except groq_sdk.RateLimitError as exc:
        print(f"[Activities Agent] RATE LIMIT: {exc}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"Groq rate limit — try again. ({exc})", "warning")
        raise
    except Exception as exc:
        print(f"[Activities Agent] LLM call failed: {exc}", flush=True)
        raise

    await update_progress(session_id, AGENT_ID, 80)

    result_dict: dict = {}
    try:
        result_dict = json.loads(_extract_json(final_text))
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"[Activities Agent] JSON parse error: {exc}\nRaw: {final_text[:500]}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"JSON parse error — applying defaults: {exc}", "warning")

    await update_progress(session_id, AGENT_ID, 90)

    if "suggestedItinerary" in result_dict and "schedule" not in result_dict:
        old = result_dict.pop("suggestedItinerary")
        result_dict["schedule"] = [
            {
                "day": d.get("day", i + 1),
                "date": d.get("date", ""),
                "slots": [],
                "freeTime": d.get("freeTime", ""),
            }
            for i, d in enumerate(old)
        ]

    try:
        validated = ActivitiesResult(**result_dict)
    except Exception as exc:
        print(f"[Activities Agent] Validation error: {exc}", flush=True)
        await emit_thought(session_id, AGENT_ID, "Applying schema corrections...", "warning")
        result_dict = _patch_result(result_dict, form_data, budget_allocated)
        validated = ActivitiesResult(**result_dict)

    paid = sum(
        a.price * (num_travelers if a.priceType == "per_person" else 1)
        for a in validated.activities if a.price > 0
    )
    free_count = sum(1 for a in validated.activities if a.price == 0)

    await emit_thought(
        session_id, AGENT_ID,
        f"Curated {len(validated.activities)} activities ({free_count} free) — "
        f"estimated spend: {paid:.0f} {form_data.currency}",
        "info",
    )

    result_payload = validated.model_dump()
    await store_result(session_id, AGENT_ID, result_payload)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    print(f"[Activities Agent] Done — activities={len(validated.activities)}, days={len(validated.schedule)}", flush=True)
    return result_payload
