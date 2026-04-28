export type AgentId =
  | "visa_insurance"
  | "budget"
  | "accommodation"
  | "transportation"
  | "activities";

export type AgentStatus = "pending" | "running" | "completed" | "failed";

export interface AgentThought {
  timestamp: string;
  message: string;
  type: "info" | "search" | "decision" | "warning";
}

export interface AgentState {
  agentId: AgentId;
  status: AgentStatus;
  progress: number;
  thoughts: AgentThought[];
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  overallStatus: "running" | "completed" | "failed";
  agents: Record<AgentId, AgentState>;
}

export const AGENT_LABELS: Record<AgentId, string> = {
  budget: "Budget Agent",
  visa_insurance: "Visa & Insurance",
  accommodation: "Accommodation",
  transportation: "Transportation",
  activities: "Activities",
};

export const AGENT_DESCRIPTIONS: Record<AgentId, string> = {
  budget: "Distributes your budget across all travel categories",
  visa_insurance: "Checks visa requirements and finds insurance packages",
  accommodation: "Searches hotels, apartments, chalets, and villas",
  transportation: "Finds rental cars, drivers, metro passes, and more",
  activities: "Discovers experiences and builds your itinerary",
};
