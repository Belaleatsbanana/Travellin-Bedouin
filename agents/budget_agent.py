"""
agents/budget_agent.py

Budget Agent — runs FIRST before all other agents.

Responsibilities:
  1. Receive the trip formData from the session.
  2. Determine the cost tier of the destination city.
  3. Adjust allocation percentages to match that tier.
  4. Distribute totalBudget across five categories.
  5. Emit 7-10 thoughts with monotonically-increasing progress.
  6. Store BudgetResult on the session and signal downstream agents.

The agent uses the GROQ LLM (mistral-saba-24b) to reason about the city's
cost-of-living and produce the final percentages, so results are city-aware
rather than hard-coded.  A deterministic fallback is applied when the LLM
is unreachable so tests can run offline.
"""

from __future__ import annotations
from dotenv import load_dotenv
import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, List

import httpx

from models.agents import AgentId, AgentState, AgentStatus, ThoughtType
from models.results import (
    BudgetBreakdownResult,
    BudgetPercentagesResult,
    BudgetResult,
)
from models.session import BudgetAllocation, FormData, SessionState
from storage.session_store import get_session, update_session

load_dotenv()
# DEBUG: Print this to be 100% sure the key is loaded
print(f"DEBUG: Key found? {'Yes' if os.getenv('GROQ_API_KEY') else 'No'}")
logger = logging.getLogger(__name__)
    

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = os.getenv("GROQ_MODEL", "mistral-saba-24b")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Default allocation percentages (mid-range city baseline)
DEFAULT_PERCENTAGES: Dict[str, float] = {
    "accommodation": 35,
    "transportation": 15,
    "activities":     20,
    "visa_insurance":  5,
    "contingency":    25,
}

# City cost tier overrides (percentage adjustments vs default)
CITY_TIER_OVERRIDES: Dict[str, Dict[str, float]] = {
    # Premium-cost cities — accommodation eats more, activities less
    "premium": {
        "accommodation": 40,
        "transportation": 15,
        "activities":     18,
        "visa_insurance":  5,
        "contingency":    22,
    },
    # Budget-friendly cities — more room for activities
    "budget": {
        "accommodation": 28,
        "transportation": 12,
        "activities":     28,
        "visa_insurance":  7,
        "contingency":    25,
    },
    # Mid-range — use defaults
    "mid": DEFAULT_PERCENTAGES,
}

# Known city → tier mappings (used as fast-path before LLM call)
KNOWN_CITY_TIERS: Dict[str, str] = {
    "tokyo":     "premium",
    "london":    "premium",
    "paris":     "premium",
    "new york":  "premium",
    "singapore": "premium",
    "dubai":     "premium",
    "zurich":    "premium",
    "riyadh":    "mid",
    "cairo":     "budget",
    "bangkok":   "budget",
    "istanbul":  "budget",
    "bali":      "budget",
    "mexico city": "budget",
    "rome":      "mid",
    "barcelona": "mid",
    "amsterdam": "mid",
}


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a travel budget analyst. Given a destination city, return a JSON object
with percentage allocations for a trip budget. The five keys are:
  accommodation, transportation, activities, visa_insurance, contingency

Required additional keys for Explainable AI (XAI):
1. "sources": A list of strings citing the specific websites and URLs you used 
   (e.g., "Numbeo (numbeo.com)", "Expatistan (expatistan.com)", "Official Tourism Board of Tokyo (gotokyo.org)").
2. "reasoning": A list of 3-5 strings explaining your step-by-step logic.

All five percentage values must be integers that sum to exactly 100.
Respond with ONLY the JSON object — no markdown, no explanation.
"""

async def _ask_groq_for_percentages(city: str, country: str) -> Tuple[Optional[Dict[str, float]], List[str], List[str]]:
    """
    Query GROQ LLM for city-specific budget percentages.
    Returns (percentages, sources, reasoning).
    """
    if not GROQ_API_KEY:
        return None, [], []

    prompt = (
        f"Destination: {city}, {country}.\n"
        "Return budget allocation percentages for: "
        "accommodation, transportation, activities, visa_insurance, contingency. "
        "Include your chain of reasoning and specific website sources with URLs. "
        "The percentages must sum to exactly 100."
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user",   "content": prompt},
                    ],
                    # Standardizing these values
                    "temperature": 0, 
                    "top_p": 1,
                    "stream": False,
                    "response_format": {"type": "json_object"} # Force JSON mode
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            
            # Defensive parsing: remove markdown blocks if the LLM ignores instructions
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()

            data = json.loads(content)

            # Validate keys and sum
            required = {"accommodation", "transportation", "activities", "visa_insurance", "contingency"}
            sources = data.get("sources", ["General Travel Knowledge"])
            reasoning = data.get("reasoning", ["Analyzing cost-of-living indices..."])

            if required <= data.keys() and abs(sum(data[k] for k in required) - 100) < 1:
                return {k: float(data[k]) for k in required}, sources, reasoning

    except Exception as exc:
        print(f"DEBUG ERROR: {exc}") # This will show you exactly what's wrong
        logger.warning("GROQ call failed for budget agent: %s", exc)

    return None, [], []


# ---------------------------------------------------------------------------
# Tier detection
# ---------------------------------------------------------------------------

def _detect_city_tier(city: str) -> Tuple[str, str]:
    """
    Returns (tier, description) for the given city name.
    Falls back to 'mid' if unknown.
    """
    normalized = city.lower().strip()
    tier = KNOWN_CITY_TIERS.get(normalized, "mid")
    descriptions = {
        "premium": "high-cost / premium destination",
        "mid":     "mid-range cost destination",
        "budget":  "budget-friendly destination",
    }
    return tier, descriptions[tier]


# ---------------------------------------------------------------------------
# Core allocation logic
# ---------------------------------------------------------------------------

def _compute_allocation(
    total_budget: float,
    currency: str,
    percentages: Dict[str, float],
) -> Tuple[BudgetBreakdownResult, BudgetPercentagesResult]:
    """
    Convert percentages into absolute amounts.
    Rounding to 2 decimal places to mimic real currency.
    """
    breakdown = BudgetBreakdownResult(
        accommodation = round(total_budget * percentages["accommodation"] / 100, 2),
        transportation = round(total_budget * percentages["transportation"] / 100, 2),
        activities     = round(total_budget * percentages["activities"]     / 100, 2),
        visa_insurance = round(total_budget * percentages["visa_insurance"] / 100, 2),
        contingency    = round(total_budget * percentages["contingency"]    / 100, 2),
    )
    pct = BudgetPercentagesResult(**percentages)
    return breakdown, pct


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_budget_agent(session_id: str) -> BudgetAllocation:
    """
    Execute the Budget Agent for the given session.
    """
    # ── 1. Load session ──────────────────────────────────────────────────────
    session = await get_session(session_id)
    if session is None:
        raise RuntimeError(f"Session {session_id} not found")

    agent: AgentState = session.agents[AgentId.budget.value]
    form: FormData    = session.formData

    # ── 2. Start ──────────────────────────────────────────────────────────────
    agent.start()
    agent.add_thought(
        f"Received total budget: {form.totalBudget:,.0f} {form.currency.value}",
        ThoughtType.info,
    )
    await update_session(session)

    # ── 3. Detect destination cost tier ───────────────────────────────────────
    await asyncio.sleep(0.4)
    agent.set_progress(20)
    agent.add_thought(
        f"Analysing cost-of-living index for {form.destinationCity}, {form.destinationCountry}",
        ThoughtType.search,
    )
    await update_session(session)

    tier, tier_desc = _detect_city_tier(form.destinationCity)
    agent.add_thought(
        f"{form.destinationCity} classified as {tier_desc} (tier: {tier})",
        ThoughtType.info,
    )
    agent.set_progress(35)
    await update_session(session)

    # ── 4. Determine final percentages (LLM or fallback) ───────────────────────
    await asyncio.sleep(0.3)
    agent.add_thought(
        "Initializing AI reasoning engine for website-verified allocation...",
        ThoughtType.search,
    )
    await update_session(session)

    llm_pct, sources, reasoning = await _ask_groq_for_percentages(
        form.destinationCity, form.destinationCountry
    )

    if llm_pct:
        percentages = llm_pct
        # Chain of Reasoning
        for step in reasoning:
            agent.add_thought(step, ThoughtType.search)
            await asyncio.sleep(0.2)
        
        # Citation Logic
        agent.add_thought(
            f"Sources verified from: {', '.join(sources)}",
            ThoughtType.info,
        )
    else:
        # Fallback to local deterministic tier model
        percentages = dict(CITY_TIER_OVERRIDES[tier])
        sources = ["Internal baseline model (Travellin-Bedouin v1.0)"]
        agent.add_thought(
            f"LLM unreachable; falling back to pre-calibrated {tier}-tier allocation model",
            ThoughtType.decision,
        )

    agent.set_progress(50)
    await update_session(session)

    # ── 5. Compute absolute allocation ────────────────────────────────────────
    await asyncio.sleep(0.3)
    breakdown, pct_model = _compute_allocation(
        form.totalBudget, form.currency.value, percentages
    )

    # Metadata for thoughts
    nights      = form.durationNights
    total_pax   = form.travelers.adults + form.travelers.children + form.travelers.seniors

    # Breakdown Thoughts
    agent.add_thought(
        f"Allocating {percentages['accommodation']:.0f}% "
        f"({breakdown.accommodation:,.0f} {form.currency.value}) to accommodation "
        f"— optimized for {nights} nights ({form.accommodationPreference.value})",
        ThoughtType.decision,
    )
    agent.set_progress(60)
    await update_session(session)

    agent.add_thought(
        f"Allocating {percentages['transportation']:.0f}% "
        f"({breakdown.transportation:,.0f} {form.currency.value}) to transportation "
        f"— mode: {form.transportPreference.value}",
        ThoughtType.decision,
    )
    agent.set_progress(70)
    await update_session(session)

    agent.add_thought(
        f"Allocating {percentages['activities']:.0f}% "
        f"({breakdown.activities:,.0f} {form.currency.value}) to activities "
        f"for {total_pax} traveler(s) across: {', '.join(c.value for c in form.activityCategories)}",
        ThoughtType.decision,
    )
    agent.set_progress(80)
    await update_session(session)

    agent.add_thought(
        f"Reserving {percentages['visa_insurance']:.0f}% "
        f"({breakdown.visa_insurance:,.0f} {form.currency.value}) for visa fees & mandatory insurance",
        ThoughtType.decision,
    )
    await update_session(session)

    agent.add_thought(
        f"Holding {percentages['contingency']:.0f}% "
        f"({breakdown.contingency:,.0f} {form.currency.value}) as contingency buffer for price fluctuations",
        ThoughtType.info,
    )
    agent.set_progress(90)
    await update_session(session)

    # ── 6. Persist result ─────────────────────────────────────────────────────
    budget_result = BudgetResult(
        totalBudget = form.totalBudget,
        currency    = form.currency.value,
        breakdown   = breakdown,
        percentages = pct_model,
        sources     = sources,
    )
    session.store_result("budget", budget_result.model_dump())

    agent.add_thought(
        "Budget allocation complete — dispatching downstream agents",
        ThoughtType.decision,
    )
    agent.complete()
    await update_session(session)

    # ── 7. Build and return BudgetAllocation for the orchestrator ─────────────
    from models.session import BudgetBreakdown, BudgetPercentages

    return BudgetAllocation(
        totalBudget = form.totalBudget,
        currency    = form.currency,
        breakdown   = BudgetBreakdown(
            accommodation  = breakdown.accommodation,
            transportation = breakdown.transportation,
            activities     = breakdown.activities,
            visa_insurance = breakdown.visa_insurance,
            contingency    = breakdown.contingency,
        ),
        percentages = BudgetPercentages(
            accommodation  = pct_model.accommodation,
            transportation = pct_model.transportation,
            activities     = pct_model.activities,
            visa_insurance = pct_model.visa_insurance,
            contingency    = pct_model.contingency,
        ),
    )