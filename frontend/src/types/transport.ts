export type TransportCategory =
  | "rental_car"
  | "dedicated_driver"
  | "metro_pass"
  | "uber_estimate"
  | "minibus";

export type TransportMode = "uber" | "taxi" | "metro" | "walk" | "rental_car" | "bus" | "dedicated_driver";

export interface TransportOption {
  id: string;
  category: TransportCategory;
  provider: string;
  description: string;
  priceTotal: number;
  currency: string;
  pricingModel: "per_day" | "fixed" | "per_trip" | "per_person";
  priceUnit: number;
  durationDays?: number;
  features: string[];
  recommended: boolean;
  bookingUrl?: string;
}

export interface TransportLeg {
  fromTime: string;
  toTime: string;
  fromLocationName: string;
  toLocationName: string;
  mode: TransportMode;
  durationMinutes: number;
  estimatedCost: number;
  currency: string;
  notes: string;
}

export interface DayLegs {
  day: number;
  date: string;
  legs: TransportLeg[];
}

export interface TransportAgentResult {
  budgetAllocated: number;
  currency: string;
  options: Record<TransportCategory, TransportOption[]>;
  recommendation: string;
  dailyLegs: DayLegs[];
}

export const TRANSPORT_LABELS: Record<TransportCategory, string> = {
  rental_car: "Rental Car",
  dedicated_driver: "Dedicated Driver",
  metro_pass: "Metro Pass",
  uber_estimate: "Rideshare",
  minibus: "Minibus / Shuttle",
};

export const MODE_LABELS: Record<TransportMode, string> = {
  uber: "Uber",
  taxi: "Taxi",
  metro: "Metro",
  walk: "Walk",
  rental_car: "Rental Car",
  bus: "Bus",
  dedicated_driver: "Driver",
};
