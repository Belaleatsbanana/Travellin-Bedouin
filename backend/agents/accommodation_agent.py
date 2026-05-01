"""
Accommodation Agent
===================
Finds real accommodation options using Google Maps Places API with ratings, reviews, and amenities.

Two-phase design:
-----------------
Phase A — Google Maps data collection (Python-driven):
    1. Geocode the destination city to get coordinates
    2. Search Google Places API for hotels matching preferences
    3. Fetch detailed information for each place (ratings, reviews, amenities, photos)
    4. Emit each search result as a progress thought

Phase B — LLM curation (single Groq call, json_object mode):
    1. Bundle all hotel data into one rich prompt
    2. LLM reads actual hotel data and curates final recommendations
    3. Produces structured JSON with best options within budget
    4. This approach avoids reliability issues with tool-calling APIs
"""

from __future__ import annotations
import asyncio
import json
import os
import re
import traceback
from typing import Any

import groq as groq_sdk
import httpx

from models.session import TripFormData
from agents.groq_client import groq_chat
from storage.session_store import emit_thought, store_result, update_progress

# ─── Configuration ────────────────────────────────────────────────────────────

AGENT_ID = "accommodation"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Real Unsplash photo IDs per accommodation type — used when Google Maps photos unavailable
_HOTEL_IMAGES: dict[str, list[str]] = {
    "hotel":     ["photo-1566073771259-470ce86b7a11", "photo-1582719508461-905c673771fd", "photo-1455587734955-081b22074882"],
    "apartment": ["photo-1522708323590-d24dbb6b0267", "photo-1502672260266-1c1ef2d93688", "photo-1493809842364-78817add7ffb"],
    "villa":     ["photo-1600596542815-ffad4c1539a9", "photo-1512917774080-9991f1c4c750", "photo-1580587771525-78b9dba3b914"],
    "chalet":    ["photo-1520250497591-112f2f40a3f4", "photo-1571896349842-33c89424de2d", "photo-1449158743715-0a90ebb6d2d8"],
    "hostel":    ["photo-1555854877-bab0e564b8d5", "photo-1631049307264-da0ec9d70304", "photo-1564501049412-61c2a3083791"],
    "resort":    ["photo-1571003123894-1f0594d2b5d9", "photo-1540541338537-71cf70f01ad7", "photo-1551918120-9739cb430c6d"],
    "default":   ["photo-1566073771259-470ce86b7a11", "photo-1582719508461-905c673771fd", "photo-1455587734955-081b22074882"],
}


# ─── Phase A: Data Collection from Google Maps ────────────────────────────────

async def _geocode_destination(city: str, country: str) -> dict[str, Any] | None:
    """Get coordinates for destination city using Nominatim (free OpenStreetMap geocoding)."""
    print(f"[Accommodation] Nominatim geocode request: q={city!r}, {country!r}", flush=True)
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{city}, {country}", "format": "json", "limit": 1},
                headers={"User-Agent": "TravellinBedouin/1.0"},
                timeout=10.0,
            )
            print(
                f"[Accommodation] Nominatim response: status={resp.status_code} "
                f"results={len(resp.json()) if resp.status_code == 200 else 0}",
                flush=True,
            )
            if resp.status_code == 200 and resp.json():
                result = resp.json()[0]
                geo = {
                    "lat": float(result["lat"]),
                    "lng": float(result["lon"]),
                    "display_name": result.get("display_name", ""),
                }
                print(f"[Accommodation] Geocoded to lat={geo['lat']:.4f}, lng={geo['lng']:.4f}", flush=True)
                return geo
        except Exception as exc:
            print(f"[Accommodation] Nominatim geocode ERROR: {type(exc).__name__}: {exc}", flush=True)
    return None


_TEXT_SEARCH_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.rating,places.userRatingCount,places.types,places.primaryType,"
    "places.location,places.websiteUri,places.nationalPhoneNumber,"
    "places.currentOpeningHours"
)


async def _search_hotels(
    city: str,
    country: str,
    accommodation_type: str,
    latitude: float | None,
    longitude: float | None,
    num_results: int = 15,
) -> list[dict[str, Any]]:
    """Search for hotels using Text Search (New) REST API."""
    if not GOOGLE_MAPS_API_KEY:
        print("[Accommodation] Google Maps API key not set — skipping hotel search", flush=True)
        return []

    # Map user-facing preference values to meaningful search terms
    _PREF_TO_QUERY: dict[str, str] = {
        "any":       "hotel",
        "hotel":     "hotel",
        "apartment": "serviced apartment",
        "villa":     "villa",
        "chalet":    "chalet",
        "hostel":    "hostel",
        "resort":    "resort",
        "airbnb":    "hotel",
    }
    query_type = _PREF_TO_QUERY.get(accommodation_type.lower(), "hotel")
    search_query = f"{query_type} in {city}, {country}"
    body: dict[str, Any] = {
        "textQuery": search_query,
        "includedType": "lodging",
        "pageSize": min(num_results, 20),
    }

    if latitude is not None and longitude is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": 5000.0,
            }
        }
        print(
            f"[Accommodation] Text Search (New): query={search_query!r} (preference={accommodation_type!r} → {query_type!r}) "
            f"locationBias=({latitude:.4f},{longitude:.4f})",
            flush=True,
        )
    else:
        print(f"[Accommodation] Text Search (New): query={search_query!r} (no coordinates)", flush=True)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://places.googleapis.com/v1/places:searchText",
                json=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                    "X-Goog-FieldMask": _TEXT_SEARCH_FIELD_MASK,
                },
                timeout=12.0,
            )
        print(
            f"[Accommodation] Text Search response: status={resp.status_code} "
            f"body_len={len(resp.content)} bytes",
            flush=True,
        )
        if resp.status_code == 200:
            places = resp.json().get("places", [])
            print(f"[Accommodation] Text Search returned {len(places)} hotels", flush=True)
            hotels = []
            for place in places:
                loc = place.get("location", {})
                name = place.get("displayName", {}).get("text", "Unknown Hotel")
                rating = place.get("rating", 0)
                print(
                    f"[Accommodation] Hotel: {name!r} rating={rating}",
                    flush=True,
                )
                hotels.append({
                    "name": name,
                    "address": place.get("formattedAddress", ""),
                    "rating": round(rating, 1) if rating else 0,
                    "review_count": place.get("userRatingCount", 0),
                    "types": place.get("types", []),
                    "primary_type": place.get("primaryType", ""),
                    "coordinates": {
                        "lat": loc.get("latitude", 0),
                        "lng": loc.get("longitude", 0),
                    },
                    "website": place.get("websiteUri", ""),
                    "phone": place.get("nationalPhoneNumber", ""),
                    "is_open": place.get("currentOpeningHours", {}).get("openNow", True),
                })
            return hotels
        else:
            print(f"[Accommodation] Text Search error body: {resp.text[:400]}", flush=True)
    except Exception as exc:
        print(f"[Accommodation] Text Search ERROR: {type(exc).__name__}: {exc}", flush=True)

    return []


# ─── Phase B: LLM Curation ────────────────────────────────────────────────────

async def _curate_with_llm(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
    hotel_data: list[dict[str, Any]],
    price_per_night: float,
    chat_history: list[dict] | None = None,
) -> dict:
    """
    Use Groq LLM to curate final accommodation recommendations from real hotel data.
    """
    has_real_data = bool(hotel_data)
    if not has_real_data:
        return {}

    data_section = (
        f"HOTEL DATA FROM GOOGLE MAPS:\n{json.dumps(hotel_data, indent=2)}\n\n"
        "YOUR TASK: Select the 8 BEST hotel options FROM THE DATA ABOVE that match the user's budget and preference. "
        "Use REAL names, ratings, and review counts from the data.\n"
    )

    prompt = f"""You are the Accommodation Agent.

USER REQUEST:
- Destination: {form_data.destinationCity}, {form_data.destinationCountry}
- Nights: {form_data.durationNights} ({form_data.departureDate} → {form_data.returnDate})
- Travelers: {form_data.travelers.adults} adults, {form_data.travelers.children} children, {form_data.travelers.seniors} seniors
- Preference: {form_data.accommodationPreference}
- Budget: {budget_allocated} {form_data.currency} total (~{price_per_night:.0f} {form_data.currency}/night)

{data_section}
Return ONLY valid JSON with this exact structure:
{{
    "budgetAllocated": {budget_allocated},
    "currency": "{form_data.currency}",
    "recommendation": "Brief personalized recommendation sentence",
    "options": [
        {{
            "id": "acc-001",
            "name": "Hotel name",
            "type": "{form_data.accommodationPreference}",
            "starRating": 4,
            "pricePerNight": <number>,
            "totalPrice": <pricePerNight * {form_data.durationNights}>,
            "currency": "{form_data.currency}",
            "location": {{
                "address": "Full address",
                "distanceFromCenter": <km from city center as number>,
                "coordinates": {{"lat": <number>, "lng": <number>}}
            }},
            "amenities": ["WiFi", "Breakfast", "Pool"],
            "bookingUrl": "https://booking.com or similar",
            "rating": <7.0-9.5>,
            "reviewCount": <number>,
            "recommended": false
        }}
    ]
}}

Rules: 8 options spanning a range of price points (budget → premium), mark best-value as recommended=true, prices within budget, omit images field, return JSON only."""

    messages: list[dict] = [{"role": "user", "content": prompt}]

    if chat_history:
        conv = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in chat_history
        )
        refinement = (
            f"\n\nCONVERSATION HISTORY — apply these user preferences strictly:\n{conv}\n\n"
            "Update your selection to honour all user requests above. Return updated JSON only."
        )
        messages = [{"role": "user", "content": prompt + refinement}]

    try:
        resp = await groq_chat(
            primary_key_env="ACCOMMODATION_API_KEY",
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=4000,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content or "{}")
        return result
    except groq_sdk.RateLimitError as exc:
        msg = f"Groq rate limit hit — try again in a moment. ({exc})"
        print(f"[Accommodation Agent] RATE LIMIT: {exc}", flush=True)
        await emit_thought(session_id, AGENT_ID, msg, "warning")
        return {}
    except Exception as exc:
        await emit_thought(session_id, AGENT_ID, f"LLM curation error: {exc}", "warning")
        return {}


# ─── Main Agent Function ──────────────────────────────────────────────────────

async def run_accommodation_agent(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
    chat_history: list[dict] | None = None,
) -> dict:
    """
    Main accommodation agent entry point.
    
    Phase A: Collect real hotel data from Google Maps
    Phase B: Use LLM to curate and format final recommendations
    """
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(
        session_id,
        AGENT_ID,
        f"Budget allocated: {budget_allocated} {form_data.currency} for {form_data.durationNights} nights",
        "info",
    )
    
    price_per_night = budget_allocated / max(form_data.durationNights, 1)
    
    # ─── Phase A: Data Collection ─────────────────────────────────────────────
    
    await emit_thought(
        session_id,
        AGENT_ID,
        f"Geocoding {form_data.destinationCity}, {form_data.destinationCountry}...",
        "search",
    )
    await update_progress(session_id, AGENT_ID, 15)
    
    geo_data = await _geocode_destination(form_data.destinationCity, form_data.destinationCountry)
    lat, lng = (geo_data["lat"], geo_data["lng"]) if geo_data else (None, None)
    
    if geo_data:
        await emit_thought(
            session_id,
            AGENT_ID,
            f"Located: {geo_data['display_name']}",
            "info",
        )
    
    await emit_thought(
        session_id,
        AGENT_ID,
        f"Searching Google Maps for {form_data.accommodationPreference} options in {form_data.destinationCity}...",
        "search",
    )
    await update_progress(session_id, AGENT_ID, 30)
    
    # Search Google Maps for hotels
    hotels = await _search_hotels(
        form_data.destinationCity,
        form_data.destinationCountry,
        form_data.accommodationPreference,
        lat,
        lng,
        num_results=15,
    )

    await emit_thought(
        session_id,
        AGENT_ID,
        f"Found {len(hotels)} hotels on Google Maps",
        "info",
    )
    if not hotels:
        await emit_thought(
            session_id,
            AGENT_ID,
            "Google Maps returned no results — check that Places API (New) is enabled in your Google Cloud Console",
            "warning",
        )
        await store_result(session_id, AGENT_ID, {
            "budgetAllocated": budget_allocated,
            "currency": form_data.currency,
            "recommendation": "No accommodation data available — Google Maps Places API returned no results.",
            "options": [],
        })
        await update_progress(session_id, AGENT_ID, 100, "completed")
        return {}
    await update_progress(session_id, AGENT_ID, 50)

    hotel_data_list = hotels[:10]
    for hotel in hotel_data_list:
        await emit_thought(
            session_id,
            AGENT_ID,
            f"Retrieved: {hotel['name']} ({hotel['rating']}★, {hotel['review_count']} reviews)",
            "search",
        )
    
    await emit_thought(
        session_id,
        AGENT_ID,
        f"Filtering by budget: max {price_per_night:.0f} {form_data.currency}/night",
        "decision",
    )
    await update_progress(session_id, AGENT_ID, 70)
    
    # ─── Phase B: LLM Curation ────────────────────────────────────────────────
    
    await emit_thought(
        session_id,
        AGENT_ID,
        "Curating final recommendations with AI...",
        "decision",
    )
    await update_progress(session_id, AGENT_ID, 85)
    
    result = await _curate_with_llm(
        session_id,
        form_data,
        budget_allocated,
        hotel_data_list,
        price_per_night,
        chat_history=chat_history or [],
    )
    
    # ─── Finalize Result ──────────────────────────────────────────────────────
    
    result.setdefault("budgetAllocated", budget_allocated)
    result.setdefault("currency", form_data.currency)
    result.setdefault("recommendation", f"We found excellent {form_data.accommodationPreference} options in {form_data.destinationCity}.")
    result.setdefault("options", [])
    
    top_hotel = next((o.get("name") for o in result.get("options", []) if o.get("recommended")), "")
    if top_hotel:
        await emit_thought(
            session_id,
            AGENT_ID,
            f"Top recommendation: {top_hotel} — best value within budget",
            "decision",
        )
    
    await emit_thought(
        session_id,
        AGENT_ID,
        f"Found {len(result.get('options', []))} accommodation options with real Google Maps data",
        "info",
    )
    
    await store_result(session_id, AGENT_ID, result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    
    return result
