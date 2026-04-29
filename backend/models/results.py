from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


# ─── Budget ───────────────────────────────────────────────────────────────────

class BudgetBreakdown(BaseModel):
    accommodation: float
    transportation: float
    activities: float
    visa_insurance: float
    contingency: float


class BudgetPercentages(BaseModel):
    accommodation: float
    transportation: float
    activities: float
    visa_insurance: float
    contingency: float


class BudgetResult(BaseModel):
    totalBudget: float
    currency: str
    breakdown: BudgetBreakdown
    percentages: BudgetPercentages


# ─── Visa & Insurance ─────────────────────────────────────────────────────────

class VisaRequirement(BaseModel):
    required: bool
    visaType: str
    processingDays: int
    cost: float
    currency: str
    applicationUrl: str
    notes: list[str]
    documentsRequired: list[str]


class TravelAdvisory(BaseModel):
    level: Literal["safe", "caution", "warning", "restricted"]
    message: str


class InsurancePackage(BaseModel):
    id: str
    provider: str
    planName: str
    coverageType: Literal["basic", "standard", "premium"]
    pricePerPerson: float
    totalPrice: float
    currency: str
    coverageHighlights: list[str]
    medicalCoverage: float
    cancellationCoverage: float
    recommended: bool


class VisaResult(BaseModel):
    visaRequirement: VisaRequirement
    travelAdvisory: TravelAdvisory
    entryRequirements: list[str]
    insurancePackages: list[InsurancePackage]


# ─── Accommodation ────────────────────────────────────────────────────────────

class Coordinates(BaseModel):
    lat: float
    lng: float


class AccommodationLocation(BaseModel):
    address: str
    distanceFromCenter: float
    coordinates: Coordinates


class AccommodationOption(BaseModel):
    id: str
    name: str
    type: Literal["hotel", "apartment", "chalet", "villa"]
    starRating: int
    pricePerNight: float
    totalPrice: float
    currency: str
    location: AccommodationLocation
    amenities: list[str]
    images: list[str]
    bookingUrl: str
    rating: float
    reviewCount: int
    recommended: bool


class AccommodationResult(BaseModel):
    budgetAllocated: float
    currency: str
    recommendation: str
    options: list[AccommodationOption]


# ─── Transport ────────────────────────────────────────────────────────────────

class TransportOption(BaseModel):
    id: str
    category: str
    provider: str
    description: str
    priceTotal: float
    currency: str
    pricingModel: Literal["per_day", "fixed", "per_trip", "per_person"]
    priceUnit: float
    durationDays: int
    features: list[str]
    recommended: bool
    bookingUrl: str


class TransportOptions(BaseModel):
    rental_car: list[TransportOption] = []
    dedicated_driver: list[TransportOption] = []
    metro_pass: list[TransportOption] = []
    uber_estimate: list[TransportOption] = []
    minibus: list[TransportOption] = []


class TransportResult(BaseModel):
    budgetAllocated: float
    currency: str
    recommendation: str
    options: TransportOptions


# ─── Activities ───────────────────────────────────────────────────────────────

class Activity(BaseModel):
    id: str
    name: str
    category: str
    description: str
    duration: Literal["half_day", "full_day", "evening", "multi_day"]
    price: float
    priceType: Literal["per_person", "per_group"]
    currency: str
    location: str
    rating: float
    reviewCount: int
    included: list[str]
    meetingPoint: Optional[str] = ""
    bookingUrl: Optional[str] = ""
    images: list[str]
    recommended: bool
    dayRecommended: Optional[int] = None


class ItineraryDay(BaseModel):
    day: int
    date: str
    activities: list[str]
    freeTime: str


class ActivitiesResult(BaseModel):
    budgetAllocated: float
    currency: str
    recommendation: str
    activities: list[Activity]
    suggestedItinerary: list[ItineraryDay]


# ─── Full Result ──────────────────────────────────────────────────────────────

class FullResult(BaseModel):
    sessionId: str
    formData: dict
    budget: Optional[BudgetResult] = None
    visa: Optional[VisaResult] = None
    accommodation: Optional[AccommodationResult] = None
    transport: Optional[TransportResult] = None
    activities: Optional[ActivitiesResult] = None
