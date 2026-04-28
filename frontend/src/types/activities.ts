export type ActivityDuration =
  | "half_day"
  | "full_day"
  | "evening"
  | "multi_day";

export interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: ActivityDuration;
  price: number;
  priceType: "per_person" | "per_group";
  currency: string;
  location: string;
  rating: number;
  reviewCount: number;
  included: string[];
  meetingPoint?: string;
  bookingUrl?: string;
  images: string[];
  recommended: boolean;
  dayRecommended?: number;
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: string[];
  freeTime: string;
}

export interface ActivitiesAgentResult {
  budgetAllocated: number;
  currency: string;
  activities: Activity[];
  suggestedItinerary: ItineraryDay[];
  recommendation: string;
}

export const DURATION_LABELS: Record<ActivityDuration, string> = {
  half_day: "Half Day",
  full_day: "Full Day",
  evening: "Evening",
  multi_day: "Multi Day",
};
