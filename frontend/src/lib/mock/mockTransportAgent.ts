import type { TransportAgentResult } from "@/types/transport";
import type { AgentThought } from "@/types/agents";

export const mockTransportResult: TransportAgentResult = {
  budgetAllocated: 750,
  currency: "USD",
  recommendation:
    "A 7-day Tokyo Metro pass combined with occasional rideshare for late nights provides the most efficient and affordable coverage of the city.",
  options: {
    rental_car: [
      {
        id: "tr-car-001",
        category: "rental_car",
        provider: "Toyota Rent a Car",
        description: "Toyota Corolla — Compact, automatic transmission, full insurance",
        priceTotal: 490,
        currency: "USD",
        pricingModel: "per_day",
        priceUnit: 70,
        durationDays: 7,
        features: ["Full collision insurance", "GPS navigation included", "Free cancellation 48h prior", "English support"],
        recommended: false,
        bookingUrl: "https://rent.toyota.co.jp/",
      },
    ],
    dedicated_driver: [
      {
        id: "tr-drv-001",
        category: "dedicated_driver",
        provider: "JapanDriver.com",
        description: "English-speaking private driver, available full day",
        priceTotal: 560,
        currency: "USD",
        pricingModel: "per_day",
        priceUnit: 80,
        durationDays: 7,
        features: ["English-speaking driver", "Door-to-door service", "Flexible itinerary", "Luxury vehicle"],
        recommended: false,
        bookingUrl: "https://www.japandriver.com/",
      },
    ],
    metro_pass: [
      {
        id: "tr-metro-001",
        category: "metro_pass",
        provider: "Tokyo Metro",
        description: "7-Day Unlimited Tokyo Metro Pass",
        priceTotal: 55,
        currency: "USD",
        pricingModel: "fixed",
        priceUnit: 55,
        features: ["Unlimited rides on all 9 Tokyo Metro lines", "IC card included", "Toei Subway discount"],
        recommended: true,
        bookingUrl: "https://www.tokyometro.jp/en/",
      },
      {
        id: "tr-metro-002",
        category: "metro_pass",
        provider: "JR East",
        description: "JR Tokyo Wide Pass — 3 Days",
        priceTotal: 75,
        currency: "USD",
        pricingModel: "fixed",
        priceUnit: 75,
        features: ["Unlimited Shinkansen in Greater Tokyo", "Includes Narita Express", "Seat reservations included"],
        recommended: false,
      },
    ],
    uber_estimate: [
      {
        id: "tr-uber-001",
        category: "uber_estimate",
        provider: "Uber Japan",
        description: "Estimated rideshare spend — airport + late-night trips",
        priceTotal: 180,
        currency: "USD",
        pricingModel: "per_trip",
        priceUnit: 25,
        features: ["4 airport transfer trips estimated", "3 late-night trips estimated", "In-app payment"],
        recommended: false,
      },
    ],
    minibus: [
      {
        id: "tr-bus-001",
        category: "minibus",
        provider: "Willer Express",
        description: "Airport shuttle + Nikko day trip minibus",
        priceTotal: 120,
        currency: "USD",
        pricingModel: "per_person",
        priceUnit: 60,
        features: ["Airport pickup & dropoff", "Guided day trip option", "Air conditioned", "Free WiFi onboard"],
        recommended: false,
        bookingUrl: "https://willerexpress.com/",
      },
    ],
  },
  dailyLegs: [
    {
      day: 1, date: "2026-06-01",
      legs: [
        { fromTime: "09:45", toTime: "10:00", fromLocationName: "Hotel", toLocationName: "TeamLab Borderless", mode: "metro", durationMinutes: 15, estimatedCost: 2, currency: "USD", notes: "Yurikamome Line to Odaiba" },
        { fromTime: "14:00", toTime: "14:20", fromLocationName: "TeamLab Borderless", toLocationName: "Hotel", mode: "metro", durationMinutes: 20, estimatedCost: 2, currency: "USD", notes: "" },
      ],
    },
    {
      day: 2, date: "2026-06-02",
      legs: [
        { fromTime: "10:30", toTime: "10:45", fromLocationName: "Hotel", toLocationName: "Shinjuku", mode: "metro", durationMinutes: 15, estimatedCost: 1.5, currency: "USD", notes: "" },
      ],
    },
  ],
};

export const mockTransportThoughts: AgentThought[] = [
  { timestamp: new Date().toISOString(), message: "Budget allocated: $750 for transportation (7 days)", type: "info" },
  { timestamp: new Date().toISOString(), message: "User preference: mixed transport — searching all categories", type: "search" },
  { timestamp: new Date().toISOString(), message: "Searching rental car options in Tokyo for 7 days...", type: "search" },
  { timestamp: new Date().toISOString(), message: "Searching dedicated driver services...", type: "search" },
  { timestamp: new Date().toISOString(), message: "Metro pass: 7-day unlimited at $55 — excellent value for Tokyo", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Estimating rideshare costs for airport + late-night coverage", type: "search" },
  { timestamp: new Date().toISOString(), message: "Recommended combo: Metro Pass ($55) + Rideshare ($180) = $235 total", type: "decision" },
  { timestamp: new Date().toISOString(), message: "All transport options compiled within $750 budget", type: "info" },
];
