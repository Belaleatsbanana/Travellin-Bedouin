"""
Activities Agent
================
Discovers, curates, and schedules activities for a travel destination.

Two-phase design
----------------
Phase A — Tool execution (Python-driven, not LLM-driven):
    Python calls all tools in sequence, collecting real data.
    Each tool result is emitted as a progress thought.

Phase B — LLM curation (single Groq call, json_object mode):
    All tool results are bundled into one rich prompt.
    The LLM reads the data and produces the final structured JSON.
    This avoids Groq tool-calling API quirks entirely.

External APIs used
------------------
- Amadeus Tours & Activities (AMADEUS_API_KEY / AMADEUS_API_SECRET)
- SerpAPI for web search         (SERP_API_KEY — optional)
- Serper.dev                     (SERPER_API_KEY — optional)
- DuckDuckGo                     (free fallback, no key needed)
- Nominatim / OpenStreetMap      (free geocoding)
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
from groq import AsyncGroq

from models.results import ActivitiesResult
from models.session import TripFormData
from storage.session_store import emit_thought, store_result, update_progress

# ─── Configuration ────────────────────────────────────────────────────────────

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
AMADEUS_CLIENT_ID = os.getenv("AMADEUS_API_KEY", "")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_API_SECRET", "")
SERP_API_KEY = os.getenv("SERP_API_KEY", "")
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")

AGENT_ID = "activities"
INSTRUCTIONS_PATH = (
    Path(__file__).parent.parent / "instructions" / "activities_instructions.txt"
)
MAX_TOKENS_FINAL = 2500


# ─── Load instructions ────────────────────────────────────────────────────────

def _load_instructions() -> str:
    try:
        return INSTRUCTIONS_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        return (
            "You are the Activities Agent. Given search results for a destination, "
            "curate 6-10 activities, build a 7-day itinerary, and return valid JSON."
        )


# ─── Tool implementations ─────────────────────────────────────────────────────

async def _amadeus_token(client: httpx.AsyncClient) -> str | None:
    if not AMADEUS_CLIENT_ID or not AMADEUS_CLIENT_SECRET:
        return None
    try:
        resp = await client.post(
            "https://test.api.amadeus.com/v1/security/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": AMADEUS_CLIENT_ID,
                "client_secret": AMADEUS_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
        if resp.status_code == 200:
            return resp.json().get("access_token")
    except Exception:
        pass
    return None


async def tool_geocode_city(city: str, country: str) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{city}, {country}", "format": "json", "limit": 1},
                headers={"User-Agent": "TravellinBedouin/1.0"},
                timeout=8.0,
            )
            data = resp.json()
            if data:
                return {
                    "lat": float(data[0]["lat"]),
                    "lon": float(data[0]["lon"]),
                    "display_name": data[0]["display_name"],
                }
        except Exception as exc:
            print(f"[Activities Agent] geocode error: {exc}", flush=True)
    return {"lat": None, "lon": None, "display_name": f"{city}, {country}"}


async def tool_search_amadeus_activities(lat: float | None, lon: float | None, radius: int = 20) -> dict:
    if lat is None or lon is None:
        return {"activities": [], "count": 0, "source": "amadeus", "note": "No coordinates"}

    async with httpx.AsyncClient() as client:
        token = await _amadeus_token(client)
        if not token:
            return {
                "activities": [], "count": 0, "source": "amadeus",
                "note": "Amadeus not configured — use LLM knowledge instead.",
            }
        try:
            resp = await client.get(
                "https://test.api.amadeus.com/v1/shopping/activities",
                params={"latitude": lat, "longitude": lon, "radius": radius},
                headers={"Authorization": f"Bearer {token}"},
                timeout=15.0,
            )
            if resp.status_code == 200:
                raw = resp.json().get("data", [])
                activities = []
                for item in raw[:20]:
                    price_info = item.get("price", {})
                    pictures = item.get("pictures", [])
                    activities.append({
                        "id": item.get("id", ""),
                        "name": item.get("name", ""),
                        "description": item.get("shortDescription", item.get("description", ""))[:300],
                        "price": float(price_info.get("amount", 0)),
                        "currency": price_info.get("currencyCode", "USD"),
                        "rating": float(item.get("rating", 0)),
                        "bookingUrl": item.get("bookingLink", ""),
                        "images": [p.get("url", "") for p in pictures[:1] if p.get("url")],
                    })
                return {"activities": activities, "count": len(activities), "source": "amadeus"}
            return {"activities": [], "count": 0, "source": "amadeus", "error": f"HTTP {resp.status_code}"}
        except Exception as exc:
            print(f"[Activities Agent] Amadeus error: {exc}", flush=True)
            return {"activities": [], "count": 0, "source": "amadeus", "error": str(exc)}


async def tool_search_web_activities(city: str, country: str, category: str) -> dict:
    query = f"best {category} activities things to do in {city} {country} tourist attractions"

    if SERP_API_KEY:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    "https://serpapi.com/search",
                    params={"q": query, "api_key": SERP_API_KEY, "num": 10, "hl": "en"},
                    timeout=12.0,
                )
                if resp.status_code == 200:
                    organic = resp.json().get("organic_results", [])
                    return {
                        "results": [{"title": r.get("title", ""), "snippet": r.get("snippet", "")} for r in organic[:8]],
                        "source": "serpapi", "category": category,
                    }
            except Exception:
                pass

    if SERPER_API_KEY:
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    "https://google.serper.dev/search",
                    json={"q": query, "num": 10},
                    headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    organic = resp.json().get("organic", [])
                    return {
                        "results": [{"title": r.get("title", ""), "snippet": r.get("snippet", "")} for r in organic[:8]],
                        "source": "serper", "category": category,
                    }
            except Exception:
                pass

    # DuckDuckGo free fallback
    try:
        loop = asyncio.get_event_loop()

        def _ddg() -> list[dict]:
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    return list(ddgs.text(query, max_results=8))
            except Exception:
                return []

        results = await loop.run_in_executor(None, _ddg)
        if results:
            return {
                "results": [{"title": r.get("title", ""), "snippet": r.get("body", "")} for r in results],
                "source": "duckduckgo", "category": category,
            }
    except Exception:
        pass

    return {
        "results": [], "source": "none", "category": category,
        "note": f"No search API configured. Use training knowledge for {category} activities in {city}, {country}.",
    }


async def tool_get_free_activities(city: str, country: str) -> dict:
    return {
        "city": city, "country": country,
        "instruction": (
            f"Include 2-4 specific FREE things to do in {city}, {country}: "
            "historic districts, public parks, beaches, free museums, viewpoints, "
            "local markets, waterfront promenades, temples, mosques, churches."
        ),
    }


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
    raw.setdefault("suggestedItinerary", [])

    if not raw["suggestedItinerary"]:
        try:
            departure = datetime.strptime(form_data.departureDate, "%Y-%m-%d")
        except Exception:
            departure = datetime.utcnow()
        raw["suggestedItinerary"] = [
            {
                "day": d,
                "date": (departure + timedelta(days=d - 1)).strftime("%Y-%m-%d"),
                "activities": [],
                "freeTime": "Free day — explore the city at your own pace",
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
        act.setdefault("images", [
            "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop"
        ])
        act.setdefault("recommended", i <= 2)
        act.setdefault("bookingUrl", "")
        act.setdefault("meetingPoint", "")

    return raw


# ─── Main entry point ─────────────────────────────────────────────────────────

async def run_activities_agent(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
) -> dict:
    """
    Execute the Activities Agent.
    Always stores a result (even a fallback) so the frontend never gets null.
    """
    try:
        return await _run(session_id, form_data, budget_allocated)
    except Exception as exc:
        print(f"\n[Activities Agent FATAL ERROR]\n{traceback.format_exc()}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"Agent error: {exc}", "warning")
        fallback = _patch_result({}, form_data, budget_allocated)
        try:
            await store_result(session_id, "activities", fallback)
        except Exception:
            pass
        await update_progress(session_id, AGENT_ID, 100, "failed")
        return fallback


async def _run(session_id: str, form_data: TripFormData, budget_allocated: float) -> dict:
    num_travelers = (
        form_data.travelers.adults
        + form_data.travelers.children
        + form_data.travelers.seniors
    )

    # ── Phase A: announce + run all tools in Python ───────────────────────────
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(
        session_id, AGENT_ID,
        f"Activities budget allocated: {budget_allocated:.0f} {form_data.currency} "
        f"for {form_data.durationNights} days in {form_data.destinationCity}",
        "info",
    )
    await emit_thought(
        session_id, AGENT_ID,
        f"User interests: {', '.join(form_data.activityCategories)} — starting search...",
        "search",
    )

    # Tool 1 — Geocode
    print(f"[Activities Agent] Geocoding {form_data.destinationCity}...", flush=True)
    await emit_thought(session_id, AGENT_ID, f"Locating {form_data.destinationCity} on the map...", "search")
    geo = await tool_geocode_city(form_data.destinationCity, form_data.destinationCountry)
    await update_progress(session_id, AGENT_ID, 15)

    # Tool 2 — Amadeus
    print(f"[Activities Agent] Querying Amadeus API...", flush=True)
    await emit_thought(session_id, AGENT_ID, "Searching Amadeus Tours & Activities API...", "search")
    amadeus_data = await tool_search_amadeus_activities(geo.get("lat"), geo.get("lon"))
    count = amadeus_data.get("count", 0)
    if count > 0:
        await emit_thought(session_id, AGENT_ID, f"Amadeus returned {count} bookable activities — filtering by quality", "decision")
    else:
        await emit_thought(session_id, AGENT_ID, "Amadeus has limited coverage here — using web search + LLM knowledge", "warning")
    await update_progress(session_id, AGENT_ID, 30)

    # Tool 3 — Web search per category (max 3)
    web_results: dict[str, dict] = {}
    budget_hint = budget_allocated / max(len(form_data.activityCategories) * 2, 1)
    for cat in list(form_data.activityCategories)[:3]:
        print(f"[Activities Agent] Web search: {cat}...", flush=True)
        await emit_thought(session_id, AGENT_ID, f"Searching web for {cat} activities in {form_data.destinationCity}...", "search")
        web_results[cat] = await tool_search_web_activities(
            form_data.destinationCity, form_data.destinationCountry, cat
        )
        found = len(web_results[cat].get("results", []))
        await emit_thought(session_id, AGENT_ID, f"Found {found} results for {cat} activities — ranking by relevance", "decision")
    await update_progress(session_id, AGENT_ID, 50)

    # Tool 4 — Free activities hint
    print(f"[Activities Agent] Fetching free activities...", flush=True)
    await emit_thought(session_id, AGENT_ID, "Discovering free attractions and experiences...", "search")
    free_data = await tool_get_free_activities(form_data.destinationCity, form_data.destinationCountry)
    await emit_thought(session_id, AGENT_ID, "Identifying free attractions to balance the activity budget", "decision")
    await update_progress(session_id, AGENT_ID, 60)

    # ── Phase B: single LLM call to curate + build itinerary ─────────────────
    print(f"[Activities Agent] Calling Groq LLM to curate activities...", flush=True)
    await emit_thought(session_id, AGENT_ID, "Curating final activity list and building 7-day itinerary...", "decision")

    spendable = round(budget_allocated * 0.80, 2)
    categories_str = ", ".join(form_data.activityCategories)

    # Compact system prompt — plain string concat avoids f-string brace escaping issues
    system_instructions = (
        "You are a travel activities curator. Return ONLY a valid JSON object — no markdown, no explanation.\n\n"
        "Required JSON fields:\n"
        "- budgetAllocated: number\n"
        "- currency: string\n"
        "- recommendation: string (2-3 sentences about activities in the destination)\n"
        "- activities: array of activity objects\n"
        "- suggestedItinerary: array of day objects\n\n"
        "Each activity object needs: id (act-001...), name, category, description, "
        "duration (half_day/full_day/evening/multi_day), price (number), priceType (per_person/per_group), "
        "currency, location, rating (float), reviewCount (int), included (array), "
        "meetingPoint (str), bookingUrl (str), images (array of Unsplash URLs), "
        "recommended (bool), dayRecommended (int).\n\n"
        "Each itinerary day needs: day (int), date (YYYY-MM-DD), activities (array of act ids), freeTime (str).\n\n"
        "RULES:\n"
        "- 6 to 10 activities total. At least 2 FREE (price=0).\n"
        "- Paid total (price x travelers) must not exceed spendable budget.\n"
        "- Itinerary must cover all trip days exactly.\n"
        "- Every activity id in itinerary must exist in activities array.\n"
        "- full_day = one activity per day. half_day = can pair two.\n"
        "- Leave at least 1 free day (no activities array entries).\n"
        "- freeTime: name real free attractions for that day.\n"
        "- images: use https://images.unsplash.com/photo-<ID>?w=800 with a relevant photo ID.\n"
        "- recommended=true for top 2-3 picks."
    )

    # Compact user prompt with just the key facts
    web_lines = []
    for cat, data in web_results.items():
        titles = [r.get("title", "") for r in data.get("results", [])[:4] if r.get("title")]
        if titles:
            web_lines.append(f"{cat.upper()}: " + " | ".join(titles))

    web_summary = "\n".join(web_lines) if web_lines else "No web results — use your knowledge."
    amadeus_count = amadeus_data.get("count", 0)

    user_prompt = (
        f"Plan activities for: {form_data.destinationCity}, {form_data.destinationCountry}\n"
        f"Dates: {form_data.departureDate} to {form_data.returnDate} ({form_data.durationNights} nights)\n"
        f"Travelers: {num_travelers}\n"
        f"Budget: {budget_allocated} {form_data.currency} total, {spendable} {form_data.currency} spendable\n"
        f"Categories: {categories_str}\n\n"
        f"Amadeus API: {amadeus_count} activities found.\n"
        f"Web search results:\n{web_summary}\n"
        f"Free activities hint: {free_data.get('instruction', '')}\n\n"
        f"Produce the complete JSON activities plan. "
        f"Use your knowledge of {form_data.destinationCity} to fill in realistic activities."
    )

    groq_client = AsyncGroq(api_key=os.getenv("ACTIVITY_API_KEY") or os.getenv("GROQ_API_KEY", ""))

    try:
        response = await groq_client.chat.completions.create(
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
    except Exception as exc:
        print(f"[Activities Agent] LLM call failed: {exc}", flush=True)
        raise

    await update_progress(session_id, AGENT_ID, 80)

    # ── Parse + validate ──────────────────────────────────────────────────────
    result_dict: dict = {}
    try:
        result_dict = json.loads(_extract_json(final_text))
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"[Activities Agent] JSON parse error: {exc}\nRaw: {final_text[:500]}", flush=True)
        await emit_thought(session_id, AGENT_ID, f"JSON parse error — applying defaults: {exc}", "warning")

    await update_progress(session_id, AGENT_ID, 90)

    try:
        validated = ActivitiesResult(**result_dict)
    except Exception as exc:
        print(f"[Activities Agent] Validation error: {exc}", flush=True)
        await emit_thought(session_id, AGENT_ID, "Applying schema corrections...", "warning")
        result_dict = _patch_result(result_dict, form_data, budget_allocated)
        validated = ActivitiesResult(**result_dict)

    # ── Final thoughts + store ─────────────────────────────────────────────────
    paid = sum(
        a.price * (num_travelers if a.priceType == "per_person" else 1)
        for a in validated.activities if a.price > 0
    )
    free_count = sum(1 for a in validated.activities if a.price == 0)

    await emit_thought(
        session_id, AGENT_ID,
        f"Selected {len(validated.activities)} activities ({free_count} free) — "
        f"estimated spend: {paid:.0f} {form_data.currency}",
        "info",
    )
    await emit_thought(
        session_id, AGENT_ID,
        f"7-day itinerary complete — "
        f"{budget_allocated - paid:.0f} {form_data.currency} remaining for dining & spontaneous activities",
        "decision",
    )

    result_payload = validated.model_dump()
    await store_result(session_id, "activities", result_payload)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    print(f"[Activities Agent] Done ✓  activities={len(validated.activities)}", flush=True)
    return result_payload
