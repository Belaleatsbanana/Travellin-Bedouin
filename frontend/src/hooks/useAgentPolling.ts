"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSessionStatus } from "@/lib/api/trip";
import { useAgentStore } from "@/store/agentStore";
import type { SessionStatusResponse } from "@/types/agents";

const MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";
const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 2000;

export function useAgentPolling(sessionId: string | null) {
  const { updateAgentStatus, setOverallStatus, overallStatus } = useAgentStore();

  // In mock mode the simulation drives agentStore directly — no polling needed.
  const query = useQuery({
    queryKey: ["session-status", sessionId],
    queryFn: () => fetchSessionStatus(sessionId!),
    enabled: !MOCK && !!sessionId,
    refetchInterval: (q) => {
      const data = q.state.data as SessionStatusResponse | undefined;
      if (!data) return POLL_MS;
      return data.overallStatus === "completed" || data.overallStatus === "failed"
        ? false
        : POLL_MS;
    },
    staleTime: 0,
  });

  // Only update the store from polling results in real (non-mock) mode.
  useEffect(() => {
    if (MOCK || !query.data) return;
    const data = query.data as SessionStatusResponse;
    setOverallStatus(
      data.overallStatus === "completed" ? "completed"
        : data.overallStatus === "failed" ? "failed"
        : "running"
    );
    for (const agentState of Object.values(data.agents)) {
      updateAgentStatus(agentState.agentId, agentState);
    }
  }, [query.data, updateAgentStatus, setOverallStatus]);

  const errorStatus = (query.error as (Error & { status?: number }) | null)?.status;

  return {
    isComplete: MOCK
      ? overallStatus === "completed"
      : (query.data as SessionStatusResponse | undefined)?.overallStatus === "completed",
    isError: !MOCK && query.isError && errorStatus !== 404,
    isSessionNotFound: !MOCK && errorStatus === 404,
    isLoading: !MOCK && query.isLoading,
  };
}
