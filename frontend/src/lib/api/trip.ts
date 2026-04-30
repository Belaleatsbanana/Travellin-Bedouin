import { apiClient } from "./client";
import type { TripFormData, CreateSessionResponse } from "@/types/trip";

const MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

export async function postCreateSession(
  formData: TripFormData
): Promise<CreateSessionResponse> {
  if (MOCK) {
    return { sessionId: `mock-${Date.now()}`, status: "initializing", estimatedDurationSeconds: 35 };
  }
  const res = await apiClient.post<CreateSessionResponse>("/api/sessions", { formData });
  return res.data;
}

export async function fetchSessionStatus(sessionId: string) {
  const res = await apiClient.get(`/api/sessions/${sessionId}/status`);
  return res.data;
}

export async function fetchPhaseResult(sessionId: string, phase: string) {
  const res = await apiClient.get(`/api/sessions/${sessionId}/phase/${phase}/result`);
  return res.data;
}

export async function postPhaseChat(sessionId: string, phase: string, message: string) {
  const res = await apiClient.post(`/api/sessions/${sessionId}/phase/${phase}/chat`, { message });
  return res.data;
}

export async function postPhaseConfirm(sessionId: string, phase: string, selectedOptionId?: string) {
  const res = await apiClient.post(`/api/sessions/${sessionId}/phase/${phase}/confirm`, {
    selectedOptionId: selectedOptionId ?? null,
  });
  return res.data as { confirmedPhase: string; nextPhase: string };
}

export async function fetchFullResults(sessionId: string) {
  const res = await apiClient.get(`/api/sessions/${sessionId}/results/full`);
  return res.data;
}
