export type TransportCategory =
  | "rental_car"
  | "dedicated_driver"
  | "metro_pass"
  | "uber_estimate"
  | "minibus";

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

export interface TransportAgentResult {
  budgetAllocated: number;
  currency: string;
  options: Record<TransportCategory, TransportOption[]>;
  recommendation: string;
}

export const TRANSPORT_LABELS: Record<TransportCategory, string> = {
  rental_car: "Rental Car",
  dedicated_driver: "Dedicated Driver",
  metro_pass: "Metro Pass",
  uber_estimate: "Rideshare",
  minibus: "Minibus / Shuttle",
};
