import type { VisaAgentResult } from "@/types/visa";
import type { AgentThought } from "@/types/agents";

export const mockVisaResult: VisaAgentResult = {
  visaRequirement: {
    required: true,
    visaType: "Tourist Visa",
    processingDays: 5,
    cost: 30,
    currency: "USD",
    applicationUrl: "https://www.mofa.go.jp/j_info/visit/visa/",
    notes: [
      "Apply at least 2 weeks before travel",
      "Single entry, valid for 90 days",
      "Visa must be obtained before arrival — visa on arrival not available",
    ],
    documentsRequired: [
      "Valid passport (6+ months validity beyond return date)",
      "Confirmed return flight ticket",
      "Hotel booking confirmation",
      "Bank statement (last 3 months, minimum $100/day)",
      "Detailed travel itinerary",
      "Passport-size photograph",
    ],
  },
  travelAdvisory: {
    level: "safe",
    message: "Japan is currently safe for travel. Standard travel precautions apply. Natural disaster awareness recommended.",
  },
  entryRequirements: [
    "Proof of onward travel required at port of entry",
    "Sufficient funds required: approx. $100/day",
    "Travel health insurance strongly recommended",
    "No vaccinations currently required for entry",
  ],
  insurancePackages: [
    {
      id: "ins-001",
      provider: "AXA Travel",
      planName: "Essential Asia",
      coverageType: "basic",
      pricePerPerson: 45,
      totalPrice: 45,
      currency: "USD",
      coverageHighlights: [
        "Medical expenses up to $50,000",
        "Trip cancellation up to $2,000",
        "Baggage loss up to $1,000",
      ],
      medicalCoverage: 50000,
      cancellationCoverage: 2000,
      recommended: false,
    },
    {
      id: "ins-002",
      provider: "Allianz",
      planName: "OneTrip Prime",
      coverageType: "standard",
      pricePerPerson: 89,
      totalPrice: 89,
      currency: "USD",
      coverageHighlights: [
        "Medical expenses up to $100,000",
        "Emergency evacuation included",
        "24/7 worldwide assistance",
        "Trip interruption coverage",
      ],
      medicalCoverage: 100000,
      cancellationCoverage: 5000,
      recommended: true,
    },
    {
      id: "ins-003",
      provider: "World Nomads",
      planName: "Explorer Plan",
      coverageType: "premium",
      pricePerPerson: 145,
      totalPrice: 145,
      currency: "USD",
      coverageHighlights: [
        "Medical expenses up to $200,000",
        "Adventure sports coverage",
        "Rental car excess coverage",
        "Electronics coverage",
      ],
      medicalCoverage: 200000,
      cancellationCoverage: 10000,
      recommended: false,
    },
  ],
};

export const mockVisaThoughts: AgentThought[] = [
  { timestamp: new Date().toISOString(), message: "Querying visa database: EG passport → JP destination", type: "search" },
  { timestamp: new Date().toISOString(), message: "Checking bilateral visa agreements between Egypt and Japan", type: "search" },
  { timestamp: new Date().toISOString(), message: "Visa required: Tourist Visa — no visa on arrival for EG nationals", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Processing time: 5 business days, cost: $30 USD", type: "info" },
  { timestamp: new Date().toISOString(), message: "Fetching current travel advisory for Japan...", type: "search" },
  { timestamp: new Date().toISOString(), message: "Advisory level: SAFE — no restrictions or warnings", type: "info" },
  { timestamp: new Date().toISOString(), message: "Compiling required entry documents list", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Querying insurance providers for budget: $250", type: "search" },
  { timestamp: new Date().toISOString(), message: "Found 3 insurance packages. Recommending Allianz OneTrip Prime for coverage/price ratio", type: "decision" },
];
