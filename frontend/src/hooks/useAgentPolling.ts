"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSessionStatus } from "@/lib/api/trip";
import { useAgentStore } from "@/store/agentStore";
import type { SessionStatusResponse } from "@/types/agents";

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 2000;

export function useAgentPolling(sessionId: string | null) {
  const { updateAgentStatus, setOverallStatus } = useAgentStore();

  const query = useQuery({
    queryKey: ["session-status", sessionId],
    queryFn: () => fetchSessionStatus(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data as SessionStatusResponse | undefined;
      if (!data) return POLL_MS;
      return data.overallStatus === "completed" ||
        data.overallStatus === "failed"
        ? false
        : POLL_MS;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!query.data) return;
    const data = query.data as SessionStatusResponse;
    setOverallStatus(
      data.overallStatus === "completed"
        ? "completed"
        : data.overallStatus === "failed"
        ? "failed"
        : "running"
    );
    for (const agentState of Object.values(data.agents)) {
      updateAgentStatus(agentState.agentId, agentState);
    }
  }, [query.data, updateAgentStatus, setOverallStatus]);

  return {
    isComplete:
      (query.data as SessionStatusResponse | undefined)?.overallStatus ===
      "completed",
    isError: query.isError,
    isLoading: query.isLoading,
  };
}
