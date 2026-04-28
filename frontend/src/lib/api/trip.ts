import { apiClient } from "./client";
import type { TripFormData, CreateSessionResponse } from "@/types/trip";
import {
  createSession,
  getSessionStatus,
} from "@/lib/mock/mockSessionSimulator";
import { mockBudgetAllocation } from "@/lib/mock/mockBudgetAgent";
import { mockVisaResult } from "@/lib/mock/mockVisaAgent";
import { mockAccommodationResult } from "@/lib/mock/mockAccommodationAgent";
import { mockTransportResult } from "@/lib/mock/mockTransportAgent";
import { mockActivitiesResult } from "@/lib/mock/mockActivitiesAgent";

const MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

export async function postCreateSession(
  formData: TripFormData
): Promise<CreateSessionResponse> {
  if (MOCK) {
    const sessionId = `mock-session-${Date.now()}`;
    createSession(sessionId);
    return { sessionId, status: "initializing", estimatedDurationSeconds: 35 };
  }
  const res = await apiClient.post<CreateSessionResponse>("/api/sessions", {
    formData,
  });
  return res.data;
}

export async function fetchSessionStatus(sessionId: string) {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return getSessionStatus(sessionId);
  }
  const res = await apiClient.get(`/api/sessions/${sessionId}/status`);
  return res.data;
}

export async function fetchFullResults(sessionId: string) {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      sessionId,
      budget: mockBudgetAllocation,
      visa: mockVisaResult,
      accommodation: mockAccommodationResult,
      transport: mockTransportResult,
      activities: mockActivitiesResult,
    };
  }
  const res = await apiClient.get(`/api/sessions/${sessionId}/results/full`);
  return res.data;
}
