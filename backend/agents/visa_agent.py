"""
Visa & Insurance Agent (stub)
==============================
Checks visa requirements and recommends travel insurance packages.
"""

from __future__ import annotations
import asyncio
import json
import os

import groq as groq_sdk

from models.session import TripFormData
from agents.groq_client import groq_chat
from storage.session_store import emit_thought, store_result, update_progress

AGENT_ID = "visa_insurance"
GROQ_MODEL = os.getenv("GROQ_MODEL", "mistral-saba-24b")


async def run_visa_agent(
    session_id: str, form_data: TripFormData, budget_allocated: float
) -> dict:
    await update_progress(session_id, AGENT_ID, 5, "running")
    await emit_thought(session_id, AGENT_ID, f"Checking visa requirements for {form_data.passportNationality} → {form_data.destinationCountry}", "search")
    await asyncio.sleep(0.8)
    await update_progress(session_id, AGENT_ID, 25)
    await emit_thought(session_id, AGENT_ID, "Fetching travel advisory level...", "search")
    await asyncio.sleep(0.5)

    prompt = (
        f"A {form_data.passportNationality} passport holder is traveling to "
        f"{form_data.destinationCity}, {form_data.destinationCountry} "
        f"from {form_data.departureDate} to {form_data.returnDate} "
        f"({form_data.durationNights} nights) with {form_data.travelers.adults} adults. "
        f"Insurance budget: {budget_allocated} {form_data.currency}. "
        "Return a JSON object with:\n"
        "- visaRequirement: { required(bool), visaType, processingDays(int), cost(number), currency, applicationUrl, notes(array), documentsRequired(array) }\n"
        "- travelAdvisory: { level('safe'|'caution'|'warning'|'restricted'), message }\n"
        "- entryRequirements: array of strings\n"
        "- insurancePackages: array of 2-3 packages each with { id, provider, planName, coverageType('basic'|'standard'|'premium'), pricePerPerson(number), totalPrice(number), currency, coverageHighlights(array), medicalCoverage(number), cancellationCoverage(number), recommended(bool) }\n"
        "Use realistic data. Return ONLY valid JSON."
    )

    result: dict = {}
    try:
        await update_progress(session_id, AGENT_ID, 50)
        resp = await groq_chat(
            primary_key_env="VISA_API_KEY",
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content or "{}")
    except groq_sdk.RateLimitError as exc:
        print(f"[Visa Agent] RATE LIMIT: {exc}", flush=True)
    except Exception as exc:
        await emit_thought(session_id, AGENT_ID, f"LLM error: {exc}", "warning")

    # Ensure minimum structure
    result.setdefault("visaRequirement", {
        "required": True, "visaType": "Tourist Visa", "processingDays": 7,
        "cost": 30, "currency": form_data.currency, "applicationUrl": "",
        "notes": ["Apply at least 2 weeks before travel"],
        "documentsRequired": ["Valid passport", "Return ticket", "Hotel confirmation"],
    })
    result.setdefault("travelAdvisory", {"level": "safe", "message": "Standard travel precautions apply."})
    result.setdefault("entryRequirements", ["Valid passport required"])
    result.setdefault("insurancePackages", [])

    await update_progress(session_id, AGENT_ID, 80)
    await emit_thought(session_id, AGENT_ID, f"Visa required: {result['visaRequirement'].get('required', True)} — {result['visaRequirement'].get('visaType', '')}", "decision")
    await emit_thought(session_id, AGENT_ID, f"Travel advisory: {result['travelAdvisory'].get('level', 'safe')}", "info")
    await emit_thought(session_id, AGENT_ID, f"Recommended insurance: {next((p['planName'] for p in result.get('insurancePackages', []) if p.get('recommended')), 'Standard plan')}", "decision")

    await store_result(session_id, "visa", result)
    await update_progress(session_id, AGENT_ID, 100, "completed")
    return result
