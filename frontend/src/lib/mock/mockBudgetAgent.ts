import type { BudgetAllocation } from "@/types/budget";
import type { AgentThought } from "@/types/agents";

export const mockBudgetAllocation: BudgetAllocation = {
  totalBudget: 5000,
  currency: "USD",
  breakdown: {
    accommodation: 1750,
    transportation: 750,
    activities: 1000,
    visa_insurance: 250,
    contingency: 1250,
  },
  percentages: {
    accommodation: 35,
    transportation: 15,
    activities: 20,
    visa_insurance: 5,
    contingency: 25,
  },
};

export const mockBudgetThoughts: AgentThought[] = [
  { timestamp: new Date().toISOString(), message: "Received total budget: $5,000 USD", type: "info" },
  { timestamp: new Date().toISOString(), message: "Analyzing destination cost-of-living index for Tokyo, Japan", type: "search" },
  { timestamp: new Date().toISOString(), message: "Tokyo classified as premium-cost destination", type: "info" },
  { timestamp: new Date().toISOString(), message: "Allocating 35% ($1,750) to accommodation — 7 nights, urban premium city", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Allocating 15% ($750) to transportation — airport transfers + city transport", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Allocating 20% ($1,000) to activities and dining experiences", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Reserving 5% ($250) for visa fees and travel insurance", type: "decision" },
  { timestamp: new Date().toISOString(), message: "Holding 25% ($1,250) contingency buffer for price fluctuations", type: "info" },
  { timestamp: new Date().toISOString(), message: "Budget allocation complete. Dispatching sub-agents.", type: "decision" },
];
