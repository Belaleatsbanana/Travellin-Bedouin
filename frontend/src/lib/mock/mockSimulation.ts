import { useAgentStore } from "@/store/agentStore";
import type { AgentId } from "@/types/agents";
import { mockBudgetThoughts, mockBudgetAllocation } from "./mockBudgetAgent";
import { mockVisaThoughts, mockVisaResult } from "./mockVisaAgent";
import { mockAccommodationThoughts, mockAccommodationResult } from "./mockAccommodationAgent";
import { mockTransportThoughts, mockTransportResult } from "./mockTransportAgent";
import { mockActivitiesThoughts, mockActivitiesResult } from "./mockActivitiesAgent";

const BUDGET_MS = 4000;
const DOWNSTREAM_MS: Record<Exclude<AgentId, "budget">, number> = {
  visa_insurance: 8000,
  accommodation: 10000,
  transportation: 9000,
  activities: 11000,
};
const THOUGHTS: Record<AgentId, (typeof mockBudgetThoughts)> = {
  budget: mockBudgetThoughts,
  visa_insurance: mockVisaThoughts,
  accommodation: mockAccommodationThoughts,
  transportation: mockTransportThoughts,
  activities: mockActivitiesThoughts,
};
const DOWNSTREAM_IDS = Object.keys(DOWNSTREAM_MS) as Exclude<AgentId, "budget">[];

function thoughtsAt(agentId: AgentId, progress: number) {
  const all = THOUGHTS[agentId];
  const count = Math.max(1, Math.ceil((progress / 100) * all.length));
  return all.slice(0, count).map((t) => ({ ...t, timestamp: new Date().toISOString() }));
}

export function startMockSimulation(): () => void {
  const store = useAgentStore;
  const start = Date.now();

  store.getState().setOverallStatus("running");
  store.getState().updateAgentStatus("budget", {
    status: "running",
    progress: 0,
    thoughts: [],
    startedAt: new Date(start).toISOString(),
  });

  const tick = setInterval(() => {
    const elapsed = Date.now() - start;

    // ── Budget agent ──────────────────────────────────
    const budgetPct = Math.min(100, (elapsed / BUDGET_MS) * 100);
    const budgetDone = budgetPct >= 100;

    store.getState().updateAgentStatus("budget", {
      status: budgetDone ? "completed" : "running",
      progress: Math.round(budgetPct),
      thoughts: thoughtsAt("budget", budgetPct),
      startedAt: new Date(start).toISOString(),
      completedAt: budgetDone ? new Date(start + BUDGET_MS).toISOString() : undefined,
    });

    if (!budgetDone) return;

    // ── Downstream agents (run in parallel after budget) ──────────
    const downStart = start + BUDGET_MS;
    const downElapsed = elapsed - BUDGET_MS;
    let allDone = true;

    for (const id of DOWNSTREAM_IDS) {
      const duration = DOWNSTREAM_MS[id];
      const pct = Math.min(100, (downElapsed / duration) * 100);
      const done = pct >= 100;
      if (!done) allDone = false;

      store.getState().updateAgentStatus(id, {
        status: done ? "completed" : "running",
        progress: Math.round(pct),
        thoughts: thoughtsAt(id, pct),
        startedAt: new Date(downStart).toISOString(),
        completedAt: done ? new Date(downStart + duration).toISOString() : undefined,
      });
    }

    if (allDone) {
      // Push all results into the store so the results page has data immediately
      store.getState().setBudgetResult(mockBudgetAllocation);
      store.getState().setVisaResult(mockVisaResult);
      store.getState().setAccommodationResult(mockAccommodationResult);
      store.getState().setTransportResult(mockTransportResult);
      store.getState().setActivitiesResult(mockActivitiesResult);
      store.getState().setOverallStatus("completed");
      clearInterval(tick);
    }
  }, 500);

  return () => clearInterval(tick);
}
