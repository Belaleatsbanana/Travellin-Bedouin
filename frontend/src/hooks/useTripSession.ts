"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { postCreateSession } from "@/lib/api/trip";
import { useTripStore } from "@/store/tripStore";
import { useAgentStore } from "@/store/agentStore";
import type { TripFormData } from "@/types/trip";

export function useTripSession() {
  const router = useRouter();
  const { setSessionId } = useTripStore();
  const { resetAgents, setOverallStatus } = useAgentStore();

  const mutation = useMutation({
    mutationFn: (formData: TripFormData) => postCreateSession(formData),
    onSuccess: (data) => {
      resetAgents();
      setOverallStatus("running");
      setSessionId(data.sessionId);
      router.push("/agents");
    },
  });

  return {
    submitTrip: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
