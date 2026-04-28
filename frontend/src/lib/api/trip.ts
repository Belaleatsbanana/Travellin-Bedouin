import { apiClient } from "./client";
import type { TripFormData, CreateSessionResponse } from "@/types/trip";
import { startMockSimulation } from "@/lib/mock/mockSimulation";

const MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

export async function postCreateSession(
  formData: TripFormData
): Promise<CreateSessionResponse> {
  if (MOCK) {
    const sessionId = `mock-${Date.now()}`;
    // Drive agentStore directly via setInterval — no Map, no polling needed
    startMockSimulation();
    return { sessionId, status: "initializing", estimatedDurationSeconds: 35 };
  }
  const res = await apiClient.post<CreateSessionResponse>("/api/sessions", { formData });
  return res.data;
}

export async function fetchSessionStatus(sessionId: string) {
  if (MOCK) {
    // In mock mode the store is updated directly by startMockSimulation.
    // Return a placeholder so the polling hook doesn't error.
    return null;
  }
  const res = await apiClient.get(`/api/sessions/${sessionId}/status`);
  return res.data;
}

export async function fetchFullResults(sessionId: string) {
  if (MOCK) {
    // Results were already pushed into agentStore by startMockSimulation.
    // Return null — AgentOrchestrator checks agentStore directly.
    return null;
  }
  const res = await apiClient.get(`/api/sessions/${sessionId}/results/full`);
  return res.data;
}
