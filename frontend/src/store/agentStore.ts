import { create } from "zustand";
import type { AgentId, AgentState, AgentThought } from "@/types/agents";
import type { BudgetAllocation } from "@/types/budget";
import type { VisaAgentResult } from "@/types/visa";
import type { AccommodationAgentResult } from "@/types/accommodation";
import type { TransportAgentResult } from "@/types/transport";
import type { ActivitiesAgentResult } from "@/types/activities";

const AGENT_IDS: AgentId[] = [
  "budget",
  "visa_insurance",
  "accommodation",
  "transportation",
  "activities",
];

const defaultAgentState = (agentId: AgentId): AgentState => ({
  agentId,
  status: "pending",
  progress: 0,
  thoughts: [],
});

const defaultAgents = (): Record<AgentId, AgentState> =>
  Object.fromEntries(
    AGENT_IDS.map((id) => [id, defaultAgentState(id)])
  ) as Record<AgentId, AgentState>;

interface AgentStoreState {
  agents: Record<AgentId, AgentState>;
  overallStatus: "idle" | "running" | "completed" | "failed";
  budgetAllocation: BudgetAllocation | null;
  visaResult: VisaAgentResult | null;
  accommodationResult: AccommodationAgentResult | null;
  transportResult: TransportAgentResult | null;
  activitiesResult: ActivitiesAgentResult | null;
  updateAgentStatus: (agentId: AgentId, patch: Partial<AgentState>) => void;
  appendThought: (agentId: AgentId, thought: AgentThought) => void;
  setBudgetResult: (result: BudgetAllocation) => void;
  setVisaResult: (result: VisaAgentResult) => void;
  setAccommodationResult: (result: AccommodationAgentResult) => void;
  setTransportResult: (result: TransportAgentResult) => void;
  setActivitiesResult: (result: ActivitiesAgentResult) => void;
  setOverallStatus: (status: AgentStoreState["overallStatus"]) => void;
  resetAgents: () => void;
}

export const useAgentStore = create<AgentStoreState>()((set) => ({
  agents: defaultAgents(),
  overallStatus: "idle",
  budgetAllocation: null,
  visaResult: null,
  accommodationResult: null,
  transportResult: null,
  activitiesResult: null,

  updateAgentStatus: (agentId, patch) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: { ...s.agents[agentId], ...patch },
      },
    })),

  appendThought: (agentId, thought) =>
    set((s) => ({
      agents: {
        ...s.agents,
        [agentId]: {
          ...s.agents[agentId],
          thoughts: [...s.agents[agentId].thoughts, thought],
        },
      },
    })),

  setBudgetResult: (result) => set({ budgetAllocation: result }),
  setVisaResult: (result) => set({ visaResult: result }),
  setAccommodationResult: (result) => set({ accommodationResult: result }),
  setTransportResult: (result) => set({ transportResult: result }),
  setActivitiesResult: (result) => set({ activitiesResult: result }),
  setOverallStatus: (status) => set({ overallStatus: status }),
  resetAgents: () =>
    set({
      agents: defaultAgents(),
      overallStatus: "idle",
      budgetAllocation: null,
      visaResult: null,
      accommodationResult: null,
      transportResult: null,
      activitiesResult: null,
    }),
}));
