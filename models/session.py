"""
models/session.py
Pydantic models for the trip-planning form data and the top-level SessionState.
"""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from models.agents import AgentState, AgentId


# ---------------------------------------------------------------------------
# Form-field enums (kept in sync with BACKEND_API_SPEC.md)
# ---------------------------------------------------------------------------

class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    SAR = "SAR"
    AED = "AED"
    EGP = "EGP"
    JPY = "JPY"


class AccommodationPreference(str, Enum):
    hotel     = "hotel"
    apartment = "apartment"
    chalet    = "chalet"
    villa     = "villa"
    any       = "any"


class TransportPreference(str, Enum):
    rental_car        = "rental_car"
    dedicated_driver  = "dedicated_driver"
    public_transport  = "public_transport"
    mixed             = "mixed"


class ActivityCategory(str, Enum):
    culture    = "culture"
    adventure  = "adventure"
    food       = "food"
    nature     = "nature"
    family     = "family"
    nightlife  = "nightlife"
    shopping   = "shopping"


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class Travelers(BaseModel):
    adults:   int = Field(default=1, ge=1)
    children: int = Field(default=0, ge=0)
    seniors:  int = Field(default=0, ge=0)


class FormData(BaseModel):
    originCountry:            str
    destinationCountry:       str
    destinationCity:          str
    departureDate:            date
    returnDate:               date
    durationNights:           int = Field(ge=1)
    travelers:                Travelers
    passportNationality:      str
    totalBudget:              float = Field(ge=500, le=1_000_000)
    currency:                 Currency
    accommodationPreference:  AccommodationPreference = AccommodationPreference.hotel
    transportPreference:      TransportPreference     = TransportPreference.mixed
    activityCategories:       List[ActivityCategory]  = Field(min_length=1)

    @field_validator("returnDate")
    @classmethod
    def return_after_departure(cls, v: date, info) -> date:
        departure = info.data.get("departureDate")
        if departure and v <= departure:
            raise ValueError("returnDate must be after departureDate")
        return v


# ---------------------------------------------------------------------------
# Budget allocation (produced by BudgetAgent, consumed by downstream agents)
# ---------------------------------------------------------------------------

class BudgetBreakdown(BaseModel):
    accommodation: float
    transportation: float
    activities:     float
    visa_insurance: float
    contingency:    float


class BudgetPercentages(BaseModel):
    accommodation: float
    transportation: float
    activities:     float
    visa_insurance: float
    contingency:    float


class BudgetAllocation(BaseModel):
    totalBudget: float
    currency:    Currency
    breakdown:   BudgetBreakdown
    percentages: BudgetPercentages


# ---------------------------------------------------------------------------
# Top-level session state — lives in the in-memory store
# ---------------------------------------------------------------------------

class SessionState(BaseModel):
    sessionId:  str
    formData:   FormData
    agents:     Dict[str, AgentState] = Field(default_factory=dict)
    results:    Dict[str, Any]        = Field(default_factory=dict)
    createdAt:  str                   = ""

    def get_agent(self, agent_id: AgentId) -> AgentState:
        return self.agents[agent_id.value]

    def store_result(self, key: str, data: Any) -> None:
        self.results[key] = data

    def is_complete(self) -> bool:
        return all(
            a.status.value == "completed"
            for a in self.agents.values()
        )
