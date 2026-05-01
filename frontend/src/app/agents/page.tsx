"use client";

// This page is no longer used — the pipeline is now at /pipeline/[sessionId]
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTripStore } from "@/store/tripStore";

export default function AgentsRedirectPage() {
  const router = useRouter();
  const { sessionId } = useTripStore();

  useEffect(() => {
    if (sessionId) {
      router.replace(`/pipeline/${sessionId}`);
    } else {
      router.replace("/plan");
    }
  }, [sessionId, router]);

  return null;
}
