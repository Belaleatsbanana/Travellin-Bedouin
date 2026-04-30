"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTripStore } from "@/store/tripStore";
import { useAgentStore } from "@/store/agentStore";
import { useAgentPolling } from "@/hooks/useAgentPolling";
import { AgentStatusGrid } from "./AgentStatusGrid";
import { ArrowRight, Loader2 } from "lucide-react";

export function AgentOrchestrator() {
  const router = useRouter();
  const { sessionId, resetTrip } = useTripStore();
  const { overallStatus } = useAgentStore();
  const { isComplete, isError, isSessionNotFound } = useAgentPolling(sessionId);

  useEffect(() => {
    if (!sessionId) router.push("/plan");
  }, [sessionId, router]);

  useEffect(() => {
    if (isSessionNotFound) {
      resetTrip();
      router.push("/plan");
    }
  }, [isSessionNotFound, resetTrip, router]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        {overallStatus === "running" && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Agents are working in parallel...
          </div>
        )}
        {overallStatus === "completed" && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium mb-4">
            ✓ All agents completed successfully!
          </div>
        )}
        {overallStatus === "failed" && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-4">
            One or more agents encountered an error.
          </div>
        )}
        {overallStatus === "running" && (
          <p className="text-brand-night/50 text-sm">This usually takes 30–60 seconds</p>
        )}
      </div>

      <AgentStatusGrid />

      {isComplete && sessionId && (
        <div className="text-center animate-fade-in-up">
          <Link
            href={`/results/${sessionId}`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-sand text-brand-night font-bold text-lg hover:bg-brand-dune transition-all hover:scale-105 shadow-lg shadow-brand-sand/20"
          >
            View Your Full Plan <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}

      {isError && (
        <div className="text-center">
          <p className="text-red-500 text-sm mb-4">Connection lost. Please check your network.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
