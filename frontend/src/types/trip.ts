export type Currency = "USD" | "EUR" | "SAR" | "AED" | "EGP" | "GBP" | "JPY";

export type AccommodationPreference =
  | "hotel"
  | "apartment"
  | "chalet"
  | "villa"
  | "any";

export type TransportPreference =
  | "rental_car"
  | "dedicated_driver"
  | "public_transport"
  | "mixed";

export type ActivityCategory =
  | "culture"
  | "adventure"
  | "food"
  | "nature"
  | "family"
  | "nightlife"
  | "shopping";

export interface TripFormData {
  originCountry: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string;
  durationNights: number;
  travelers: {
    adults: number;
    children: number;
    seniors: number;
  };
  passportNationality: string;
  totalBudget: number;
  currency: Currency;
  accommodationPreference: AccommodationPreference;
  transportPreference: TransportPreference;
  activityCategories: ActivityCategory[];
}

export interface TripSession {
  sessionId: string;
  status: "initializing" | "running" | "completed" | "failed";
  createdAt: string;
  formData: TripFormData;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: "initializing";
  estimatedDurationSeconds: number;
}
