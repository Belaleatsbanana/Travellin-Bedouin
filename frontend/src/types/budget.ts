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
}
