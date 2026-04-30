"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSessionStatus } from "@/lib/api/trip";
import { usePipelineStore } from "@/store/pipelineStore";
import type { PipelineStatusResponse } from "@/types/pipeline";

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 2000;

export function usePipelinePolling(sessionId: string | null) {
  const { setOverallStatus, setCurrentPhase, updatePhase } = usePipelineStore();

  const query = useQuery({
    queryKey: ["pipeline-status", sessionId],
    queryFn: () => fetchSessionStatus(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (q) => {
      const data = q.state.data as PipelineStatusResponse | undefined;
      if (!data) return POLL_MS;
      // Stop polling when waiting for user action or fully done
      const stop = data.overallStatus === "awaiting_confirmation" || data.overallStatus === "done";
      return stop ? false : POLL_MS;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!query.data) return;
    const data = query.data as PipelineStatusResponse;
    setOverallStatus(data.overallStatus);
    setCurrentPhase(data.currentPhase);
    for (const [phase, state] of Object.entries(data.phases)) {
      updatePhase(phase, state);
    }
  }, [query.data, setOverallStatus, setCurrentPhase, updatePhase]);

  const errorStatus = (query.error as (Error & { status?: number }) | null)?.status;

  return {
    isWaitingForUser: (query.data as PipelineStatusResponse | undefined)?.overallStatus === "awaiting_confirmation",
    isDone: (query.data as PipelineStatusResponse | undefined)?.overallStatus === "done",
    isError: query.isError && errorStatus !== 404,
    isSessionNotFound: errorStatus === 404,
    // Expose refetch so chat/confirm can re-enable polling
    resumePolling: () => query.refetch(),
  };
}
