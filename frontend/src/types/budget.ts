// frontend/src/types/budget.ts
// Matches the BudgetResult shape returned by GET /api/sessions/{sessionId}/results/budget

export interface BudgetAllocation {
  totalBudget: number;
  currency: string;
  breakdown: {
    accommodation: number;
    transportation: number;
    activities: number;
    visa_insurance: number;
    contingency: number;
  };
  percentages: {
    accommodation: number;
    transportation: number;
    activities: number;
    visa_insurance: number;
    contingency: number;
  };
  /** AI citation sources — present when GROQ_API_KEY is set, empty array otherwise */
  sources?: string[];
}
