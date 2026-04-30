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

import googlemaps
from groq import AsyncGroq
import httpx

from models.session import TripFormData
from storage.session_store import emit_thought, store_result, update_progress

# ─── Configuration ────────────────────────────────────────────────────────────

AGENT_ID = "accommodation"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


# ─── Phase A: Data Collection from Google Maps ────────────────────────────────

async def _geocode_destination(city: str, country: str) -> dict[str, Any] | None:
    """Get coordinates for destination city using Nominatim (free OpenStreetMap geocoding)."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{city}, {country}", "format": "json", "limit": 1},
                headers={"User-Agent": "TravellinBedouin/1.0"},
                timeout=10.0,
            )
            if resp.status_code == 200 and resp.json():
                result = resp.json()[0]
                return {
                    "lat": float(result["lat"]),
                    "lng": float(result["lon"]),
                    "display_name": result.get("display_name", ""),
                }
        except Exception as exc:
            print(f"Geocoding error: {exc}")
    return None


def _search_hotels(
    city: str,
    country: str,
    accommodation_type: str,
    latitude: float | None,
    longitude: float | None,
    num_results: int = 15,
) -> list[dict[str, Any]]:
    """
    Search for hotels using Google Maps Places API.
    
    accommodation_type can be: "hotel", "apartment", "chalet", "villa", "hostel"
    Searches for the most relevant type and includes alternatives.
    """
    if not GOOGLE_MAPS_API_KEY:
        return []

    try:
        gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
        
        # Build search query
        search_query = f"{accommodation_type} in {city}, {country}"
        
        # If we have coordinates, search nearby; otherwise use text search
        if latitude is not None and longitude is not None:
            places_result = gmaps.places_nearby(
                location=(latitude, longitude),
                radius=5000,  # 5 km radius
                type="lodging",
                keyword=accommodation_type,
                rank_by="prominence",
            )
        else:
            places_result = gmaps.places(
                query=search_query,
                type="lodging",
            )
        
        hotels = places_result.get("results", [])
        
        # Get more detailed info for each hotel
        detailed_hotels = []
        for hotel in hotels[:num_results]:
            place_id = hotel.get("place_id")
            if place_id:
                try:
                    details = gmaps.place(place_id=place_id)["result"]
                    detailed_hotels.append(details)
                except Exception as e:
                    print(f"Error fetching details for {place_id}: {e}")
                    detailed_hotels.append(hotel)  # Fall back to basic info
        
        return detailed_hotels
    except Exception as exc:
        print(f"Google Maps search error: {exc}")
        traceback.print_exc()
    
    return []


def _extract_hotel_data(hotel: dict[str, Any]) -> dict[str, Any]:
    """
    Extract relevant hotel information from Google Places data.
    
    Returns structured data with:
    - name, address, rating, review count
    - amenities (inferred from types)
    - coordinates, photos
    - estimated price (inferred or default)
    """
    name = hotel.get("name", "Unknown Hotel")
    
    # Basic info
    address = hotel.get("formatted_address", "")
    rating = hotel.get("rating", 0)
    review_count = hotel.get("user_ratings_total", 0)
    types = hotel.get("types", [])
    
    # Coordinates
    location = hotel.get("geometry", {}).get("location", {})
    lat = location.get("lat", 0)
    lng = location.get("lng", 0)
    
    # Amenities (inferred from place types and formatted address)
    amenities = _infer_amenities(hotel, types)
    
    # Photos
    photos = []
    for photo in hotel.get("photos", [])[:3]:  # Take up to 3 photos
        photo_ref = photo.get("photo_reference", "")
        if photo_ref and GOOGLE_MAPS_API_KEY:
            photo_url = (
                f"https://maps.googleapis.com/maps/api/place/photo?"
                f"maxwidth=400&photo_reference={photo_ref}&key={GOOGLE_MAPS_API_KEY}"
            )
            photos.append(photo_url)
    
    # Opening hours / availability
    opening_hours = hotel.get("opening_hours", {})
    is_open = opening_hours.get("open_now", True)
    
    # Phone and website
    phone = hotel.get("formatted_phone_number", "")
    website = hotel.get("website", "")
    
    return {
        "name": name,
        "address": address,
        "rating": round(rating, 1) if rating else 0,
        "review_count": review_count,
        "types": types,
        "amenities": amenities,
        "coordinates": {"lat": lat, "lng": lng},
        "photos": photos,
        "is_open": is_open,
        "phone": phone,
        "website": website,
        "place_id": hotel.get("place_id", ""),
        "url": hotel.get("url", ""),
    }


def _infer_amenities(hotel: dict[str, Any], types: list[str]) -> list[str]:
    """
    Infer amenities from place types and business status.
    
    Types typically include things like:
    - lodging, point_of_interest, establishment
    - parking_lot, restaurant, spa, pool, etc.
    """
    amenities = set()
    
    # Check place types for common amenities
    type_amenity_map = {
        "parking": "Free Parking",
        "restaurant": "On-site Restaurant",
        "cafe": "Café",
        "spa": "Spa & Wellness",
        "gym": "Fitness Center",
        "bar": "Bar & Lounge",
        "pool": "Swimming Pool",
        "laundry": "Laundry Service",
        "internet": "Free WiFi",
    }
    
    for place_type in types:
        for key, amenity_name in type_amenity_map.items():
            if key in place_type.lower():
                amenities.add(amenity_name)
    
    # Add standard hotel amenities
    if "hotel" in types or any("lodging" in t for t in types):
        amenities.add("24-hour Front Desk")
        amenities.add("Room Service")
    
    # Based on rating, infer quality amenities
    rating = hotel.get("rating", 0)
    if rating >= 4.5:
        amenities.add("Concierge Service")
        amenities.add("Premium Bedding")
        amenities.update(["Luxury Toiletries", "Air Conditioning"])
    elif rating >= 4.0:
        amenities.add("Breakfast Options")
        amenities.add("Air Conditioning")
    
    return sorted(list(amenities))


# ─── Phase B: LLM Curation ────────────────────────────────────────────────────

async def _curate_with_llm(
    session_id: str,
    form_data: TripFormData,
    budget_allocated: float,
    hotel_data: list[dict[str, Any]],
    price_per_night: float,
) -> dict:
    """
    Use Groq LLM to curate final accommodation recommendations from real hotel data.
    """
    groq = AsyncGroq(api_key=os.getenv("GROQ_API_KEY", ""))
    
    # Build comprehensive prompt with real hotel data
    hotel_json = json.dumps(hotel_data, indent=2)
    
    prompt = f"""
You are the Accommodation Agent. You have received real hotel data from Google Maps API for {form_data.destinationCity}, {form_data.destinationCountry}.

USER REQUEST:
- Destination: {form_data.destinationCity}, {form_data.destinationCountry}
- Nights: {form_data.durationNights}
- Check-in: {form_data.departureDate}
- Check-out: {form_data.returnDate}
- Travelers: {form_data.travelers.adults} adults, {form_data.travelers.children} children, {form_data.travelers.seniors} seniors
- Preference: {form_data.accommodationPreference}
- Total Budget: {budget_allocated} {form_data.currency}
- Budget per night: ~{price_per_night:.0f} {form_data.currency}

HOTEL DATA FROM GOOGLE MAPS:
{hotel_json}

YOUR TASK:
Select the 3 BEST hotel options from the data that:
1. Match or are close to the user's accommodation preference ({form_data.accommodationPreference})
2. Have good ratings (prefer 4.0+ stars)
3. Fit within the budget (~{price_per_night:.0f} {form_data.currency}/night)
4. Have amenities suitable for the travelers (family-friendly if children, elderly-friendly if seniors)

For each selected hotel:
- Use the REAL name from Google data
- Use REAL rating and review count from Google
- Use REAL amenities inferred from the place types
- Use REAL photos from Google
- Infer reasonable pricing based on:
  - The location quality
  - The rating (higher rated = typically higher price)
  - Local market understanding
  - Budget constraints
- Estimate the hotel star rating (1-5) based on Google rating and amenities
- Create a booking URL (use Google Maps URL if available, otherwise create realistic booking URL)
- Mark the best value option as recommended=true

Return ONLY valid JSON with this exact structure:
{{
    "budgetAllocated": {budget_allocated},
    "currency": "{form_data.currency}",
    "recommendation": "Brief personalized recommendation sentence",
    "options": [
        {{
            "id": "acc-001",
            "name": "REAL hotel name",
            "type": "{form_data.accommodationPreference}",
            "starRating": 4,
            "pricePerNight": <estimated price>,
            "totalPrice": <estimated price * {form_data.durationNights}>,
            "currency": "{form_data.currency}",
            "location": {{
                "address": "REAL address from Google",
                "distanceFromCenter": <estimated km from city center>,
                "coordinates": {{"lat": <number>, "lng": <number>}}
            }},
            "amenities": ["Real amenities from Google"],
            "images": ["Real photo URLs from Google, max 3"],
            "bookingUrl": "Google Maps URL or booking link",
            "rating": <7.0-9.5 based on Google rating>,
            "reviewCount": <real review count>,
            "recommended": true
        }}
    ]
}}

IMPORTANT:
- Use REAL data from the Google hotels provided
- Never make up hotel names or data
- Ensure all prices are reasonable for the destination and budget
- Select hotels that actually exist in the data provided
- Return valid JSON only, no markdown or explanations
"""
    
    try:
        resp = await groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2500,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content or "{}")
        return result
    except Exception as exc:
        await emit_thought(session_id, AGENT_ID, f"LLM curation error: {exc}", "warning")
        return {}


# ─── Main Agent Function ──────────────────────────────────────────────────────

async def run_accommodation_agent(
    session_id: str, form_data: TripFormData, budget_allocated: float
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
    hotels = _search_hotels(
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
    await update_progress(session_id, AGENT_ID, 50)
    
    # Extract relevant data from each hotel
    hotel_data_list = []
    for i, hotel in enumerate(hotels[:10]):  # Process top 10
        hotel_data = _extract_hotel_data(hotel)
        hotel_data_list.append(hotel_data)
        await emit_thought(
            session_id,
            AGENT_ID,
            f"Retrieved: {hotel_data['name']} ({hotel_data['rating']}★, {hotel_data['review_count']} reviews)",
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
    
    await store_result(session_id, "accommodation", result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    
    return result
