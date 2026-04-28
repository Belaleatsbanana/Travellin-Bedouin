import type { SessionStatusResponse, AgentId, AgentState, AgentThought } from "@/types/agents";
import { mockBudgetThoughts } from "./mockBudgetAgent";
import { mockVisaThoughts } from "./mockVisaAgent";
import { mockAccommodationThoughts } from "./mockAccommodationAgent";
import { mockTransportThoughts } from "./mockTransportAgent";
import { mockActivitiesThoughts } from "./mockActivitiesAgent";

const agentThoughts: Record<AgentId, AgentThought[]> = {
  budget: mockBudgetThoughts,
  visa_insurance: mockVisaThoughts,
  accommodation: mockAccommodationThoughts,
  transportation: mockTransportThoughts,
  activities: mockActivitiesThoughts,
};

const BUDGET_DURATION_MS = 4000;
const AGENT_DURATIONS_MS: Record<Exclude<AgentId, "budget">, number> = {
  visa_insurance: 8000,
  accommodation: 10000,
  transportation: 9000,
  activities: 11000,
};

interface SimulatorState {
  startedAt: number;
  status: SessionStatusResponse;
}

const sessions = new Map<string, SimulatorState>();

function elapsed(startedAt: number) {
  return Date.now() - startedAt;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function thoughtsUpTo(thoughts: AgentThought[], progress: number): AgentThought[] {
  const idx = Math.floor((progress / 100) * thoughts.length);
  return thoughts.slice(0, Math.max(1, idx)).map((t) => ({
    ...t,
    timestamp: new Date().toISOString(),
  }));
}

export function createSession(sessionId: string): SessionStatusResponse {
  const now = Date.now();
  const defaultAgent = (id: AgentId): AgentState => ({
    agentId: id,
    status: "pending",
    progress: 0,
    thoughts: [],
  });

  const status: SessionStatusResponse = {
    sessionId,
    overallStatus: "running",
    agents: {
      budget: { ...defaultAgent("budget"), status: "running" },
      visa_insurance: defaultAgent("visa_insurance"),
      accommodation: defaultAgent("accommodation"),
      transportation: defaultAgent("transportation"),
      activities: defaultAgent("activities"),
    },
  };

  sessions.set(sessionId, { startedAt: now, status });
  return status;
}

export function getSessionStatus(sessionId: string): SessionStatusResponse | null {
  const sim = sessions.get(sessionId);
  if (!sim) return null;

  const ms = elapsed(sim.startedAt);

  const budgetProgress = clamp((ms / BUDGET_DURATION_MS) * 100, 0, 100);
  const budgetDone = budgetProgress >= 100;

  sim.status.agents.budget = {
    agentId: "budget",
    status: budgetDone ? "completed" : "running",
    progress: budgetProgress,
    thoughts: thoughtsUpTo(agentThoughts.budget, budgetProgress),
    startedAt: new Date(sim.startedAt).toISOString(),
    completedAt: budgetDone ? new Date(sim.startedAt + BUDGET_DURATION_MS).toISOString() : undefined,
  };

  const downstreamAgents: Exclude<AgentId, "budget">[] = [
    "visa_insurance",
    "accommodation",
    "transportation",
    "activities",
  ];

  let allDone = budgetDone;

  for (const agentId of downstreamAgents) {
    if (!budgetDone) {
      sim.status.agents[agentId] = {
        agentId,
        status: "pending",
        progress: 0,
        thoughts: [],
      };
      continue;
    }

    const agentStart = sim.startedAt + BUDGET_DURATION_MS;
    const duration = AGENT_DURATIONS_MS[agentId];
    const agentMs = Date.now() - agentStart;
    const progress = clamp((agentMs / duration) * 100, 0, 100);
    const done = progress >= 100;

    if (!done) allDone = false;

    sim.status.agents[agentId] = {
      agentId,
      status: done ? "completed" : "running",
      progress,
      thoughts: thoughtsUpTo(agentThoughts[agentId], progress),
      startedAt: new Date(agentStart).toISOString(),
      completedAt: done ? new Date(agentStart + duration).toISOString() : undefined,
    };
  }

  if (allDone) {
    sim.status.overallStatus = "completed";
  }

  return sim.status;
}
