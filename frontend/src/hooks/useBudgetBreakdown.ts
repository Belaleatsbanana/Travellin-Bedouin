"use client";

import { useAgentStore } from "@/store/agentStore";
import { useSelectionStore } from "@/store/selectionStore";
import { formatCurrency } from "@/lib/utils";

export function useBudgetBreakdown() {
  const { budgetAllocation, accommodationResult, transportResult, activitiesResult } =
    useAgentStore();
  const { selectedAccommodationId, selectedTransportIds, selectedActivityIds } =
    useSelectionStore();

  if (!budgetAllocation) return null;

  const { totalBudget, currency } = budgetAllocation;

  const selectedAcc = accommodationResult?.options.find(
    (o) => o.id === selectedAccommodationId
  );

  const selectedTransportCost = Object.entries(selectedTransportIds).reduce(
    (sum, [, id]) => {
      for (const opts of Object.values(transportResult?.options ?? {})) {
        const found = (opts as { id: string; priceTotal: number }[]).find(
          (o) => o.id === id
        );
        if (found) return sum + found.priceTotal;
      }
      return sum;
    },
    0
  );

  const selectedActivitiesCost = (activitiesResult?.activities ?? [])
    .filter((a) => selectedActivityIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  const visaCost = budgetAllocation.breakdown.visa_insurance;
  const contingency = budgetAllocation.breakdown.contingency;

  const spent =
    (selectedAcc?.totalPrice ?? 0) +
    selectedTransportCost +
    selectedActivitiesCost +
    visaCost +
    contingency;

  const remaining = totalBudget - spent;

  return {
    totalBudget,
    currency,
    accCost: selectedAcc?.totalPrice ?? 0,
    transportCost: selectedTransportCost,
    activitiesCost: selectedActivitiesCost,
    visaCost,
    contingency,
    spent,
    remaining,
    isOverBudget: remaining < 0,
    fmt: (n: number) => formatCurrency(n, currency),
  };
}
