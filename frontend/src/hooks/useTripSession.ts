"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { postCreateSession } from "@/lib/api/trip";
import { useTripStore } from "@/store/tripStore";
import { usePipelineStore } from "@/store/pipelineStore";
import type { TripFormData } from "@/types/trip";

export function useTripSession() {
  const router = useRouter();
  const { setSessionId } = useTripStore();
  const { reset } = usePipelineStore();

  const mutation = useMutation({
    mutationFn: (formData: TripFormData) => postCreateSession(formData),
    onSuccess: (data) => {
      reset();
      setSessionId(data.sessionId);
      router.push(`/pipeline/${data.sessionId}`);
    },
  });

  return {
    submitTrip: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
