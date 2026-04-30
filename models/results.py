"""
models/results.py
Pydantic models for the result payloads returned by each agent.
These shapes match the BACKEND_API_SPEC exactly.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Budget result
# ---------------------------------------------------------------------------

class BudgetBreakdownResult(BaseModel):
    accommodation: float
    transportation: float
    activities:     float
    visa_insurance: float
    contingency:    float


class BudgetPercentagesResult(BaseModel):
    accommodation: float
    transportation: float
    activities:     float
    visa_insurance: float
    contingency:    float


class BudgetResult(BaseModel):
    totalBudget: float
    currency:    str
    breakdown:   BudgetBreakdownResult
    percentages: BudgetPercentagesResult
    sources:     List[str] = []


# ---------------------------------------------------------------------------
# Visa / insurance result
# ---------------------------------------------------------------------------

class VisaRequirement(BaseModel):
    required:          bool
    visaType:          Optional[str]       = None
    processingDays:    Optional[int]       = None
    cost:              Optional[float]     = None
    currency:          Optional[str]       = None
    applicationUrl:    Optional[str]       = None
    notes:             List[str]           = []
    documentsRequired: List[str]           = []


class TravelAdvisory(BaseModel):
    level:   Literal["safe", "caution", "warning", "restricted"]
    message: str


class InsurancePackage(BaseModel):
    id:                  str
    provider:            str
    planName:            str
    coverageType:        Literal["basic", "standard", "premium"]
    pricePerPerson:      float
    totalPrice:          float
    currency:            str
    coverageHighlights:  List[str]
    medicalCoverage:     float
    cancellationCoverage: float
    recommended:         bool


class VisaResult(BaseModel):
    visaRequirement:    VisaRequirement
    travelAdvisory:     TravelAdvisory
    entryRequirements:  List[str]
    insurancePackages:  List[InsurancePackage]


# ---------------------------------------------------------------------------
# Accommodation result
# ---------------------------------------------------------------------------

class Coordinates(BaseModel):
    lat: float
    lng: float


class AccommodationLocation(BaseModel):
    address:            str
    distanceFromCenter: float
    coordinates:        Coordinates


class AccommodationOption(BaseModel):
    id:          str
    name:        str
    type:        Literal["hotel", "apartment", "chalet", "villa"]
    starRating:  int
    pricePerNight: float
    totalPrice:  float
    currency:    str
    location:    AccommodationLocation
    amenities:   List[str]
    images:      List[str]
    bookingUrl:  str
    rating:      float
    reviewCount: int
    recommended: bool


class AccommodationResult(BaseModel):
    budgetAllocated: float
    currency:        str
    recommendation:  str
    options:         List[AccommodationOption]


# ---------------------------------------------------------------------------
# Transport result
# ---------------------------------------------------------------------------

class TransportOption(BaseModel):
    id:           str
    category:     str
    provider:     str
    description:  str
    priceTotal:   float
    currency:     str
    pricingModel: Literal["per_day", "fixed", "per_trip", "per_person"]
    priceUnit:    Optional[float] = None
    durationDays: Optional[int]   = None
    features:     List[str]
    recommended:  bool
    bookingUrl:   str


class TransportResult(BaseModel):
    budgetAllocated:   float
    currency:          str
    recommendation:    str
    options: Dict[
        Literal["rental_car", "dedicated_driver", "metro_pass", "uber_estimate", "minibus"],
        List[TransportOption],
    ]


# ---------------------------------------------------------------------------
# Activities result
# ---------------------------------------------------------------------------

class Activity(BaseModel):
    id:             str
    name:           str
    category:       str
    description:    str
    duration:       Literal["half_day", "full_day", "evening", "multi_day"]
    price:          float
    priceType:      Literal["per_person", "per_group"]
    currency:       str
    location:       str
    rating:         float
    reviewCount:    int
    included:       List[str]
    bookingUrl:     str
    images:         List[str]
    recommended:    bool
    dayRecommended: Optional[int] = None


class DayItinerary(BaseModel):
    day:        int
    date:       str
    activities: List[str]
    freeTime:   str


class ActivitiesResult(BaseModel):
    budgetAllocated:    float
    currency:           str
    recommendation:     str
    activities:         List[Activity]
    suggestedItinerary: List[DayItinerary]


# ---------------------------------------------------------------------------
# Full result (combined)
# ---------------------------------------------------------------------------

class FullResult(BaseModel):
    sessionId:     str
    formData:      Any
    budget:        BudgetResult
    visa:          VisaResult
    accommodation: AccommodationResult
    transport:     TransportResult
    activities:    ActivitiesResult
