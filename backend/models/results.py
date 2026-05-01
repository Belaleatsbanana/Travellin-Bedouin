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
    images: Optional[list[str]] = None
    bookingUrl: str
    rating: float
    reviewCount: int
    recommended: bool


class AccommodationResult(BaseModel):
    budgetAllocated: float
    currency: str
    recommendation: str
    options: list[AccommodationOption]


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
    images: Optional[list[str]] = None
    recommended: bool
    dayRecommended: Optional[int] = None
    coordinates: Optional[Coordinates] = None


class ScheduledSlot(BaseModel):
    startTime: str        # "HH:MM"
    endTime: str          # "HH:MM"
    type: Literal["activity"] = "activity"
    activityId: str
    activityName: str
    locationName: str
    coordinates: Optional[Coordinates] = None


class DaySchedule(BaseModel):
    day: int
    date: str             # "YYYY-MM-DD"
    slots: list[ScheduledSlot]
    freeTime: str


class ActivitiesResult(BaseModel):
    budgetAllocated: float
    currency: str
    recommendation: str
    activities: list[Activity]
    schedule: list[DaySchedule]


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


class TransportLeg(BaseModel):
    fromTime: str
    toTime: str
    fromLocationName: str
    toLocationName: str
    mode: Literal["uber", "taxi", "metro", "walk", "rental_car", "bus", "dedicated_driver"]
    durationMinutes: int
    estimatedCost: float
    currency: str
    notes: str = ""


class DayLegs(BaseModel):
    day: int
    date: str
    legs: list[TransportLeg]


class TransportResult(BaseModel):
    budgetAllocated: float
    currency: str
    recommendation: str
    options: TransportOptions
    dailyLegs: list[DayLegs] = []


# ─── Full pipeline result ─────────────────────────────────────────────────────

class ConfirmedBudget(BaseModel):
    totalBudget: float
    currency: str
    accommodationTotal: float
    activitiesTotal: float
    transportTotal: float


class FullPipelineResult(BaseModel):
    sessionId: str
    formData: dict
    budget: Optional[ConfirmedBudget] = None
    accommodation: Optional[dict] = None
    activities: Optional[dict] = None
    transport: Optional[dict] = None
