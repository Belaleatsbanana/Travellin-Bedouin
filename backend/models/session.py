from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class Travelers(BaseModel):
    adults: int = Field(ge=1, default=1)
    children: int = 0
    seniors: int = 0


class TripFormData(BaseModel):
    originCountry: str
    destinationCountry: str
    destinationCity: str
    departureDate: str
    returnDate: str
    durationNights: int
    travelers: Travelers
    passportNationality: str
    totalBudget: float = Field(ge=500, le=1_000_000)
    currency: Literal["USD", "EUR", "GBP", "SAR", "AED", "EGP", "JPY"]
    accommodationPreference: Literal["hotel", "apartment", "chalet", "villa", "any"]
    transportPreference: Literal[
        "rental_car", "dedicated_driver", "public_transport", "mixed"
    ]
    activityCategories: list[
        Literal[
            "culture", "adventure", "food", "nature",
            "family", "nightlife", "shopping",
        ]
    ]
    chatHistory: Optional[list[dict]] = None


class CreateSessionRequest(BaseModel):
    formData: TripFormData


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    message: str


class ConfirmRequest(BaseModel):
    selectedOptionId: Optional[str] = None
