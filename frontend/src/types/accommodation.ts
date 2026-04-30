export type AccommodationType = "hotel" | "apartment" | "chalet" | "villa";

export interface AccommodationOption {
  id: string;
  name: string;
  type: AccommodationType;
  description?: string;
  starRating: number;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  location: {
    address: string;
    distanceFromCenter: number;
    coordinates: { lat: number; lng: number };
  };
  amenities: string[];
  images?: string[];
  bookingUrl?: string;
  rating: number;
  reviewCount: number;
  recommended: boolean;
}

export interface AccommodationAgentResult {
  budgetAllocated: number;
  currency: string;
  options: AccommodationOption[];
  recommendation: string;
}
