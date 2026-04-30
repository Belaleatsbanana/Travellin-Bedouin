"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePipelineStore } from "@/store/pipelineStore";
import { usePipelinePolling } from "@/hooks/usePipelinePolling";
import { useTripStore } from "@/store/tripStore";
import { Navbar } from "@/components/layout/Navbar";
import { PhaseProgressBar } from "@/components/pipeline/PhaseProgressBar";
import { AccommodationPhasePanel } from "@/components/pipeline/phases/AccommodationPhasePanel";
import { ActivitiesPhasePanel } from "@/components/pipeline/phases/ActivitiesPhasePanel";
import { TransportPhasePanel } from "@/components/pipeline/phases/TransportPhasePanel";

const PHASE_TITLES: Record<string, { title: string; subtitle: string }> = {
  accommodation: {
    title: "Finding Your Accommodation",
    subtitle: "Review the options below and chat with the agent to refine your choice.",
  },
  activities: {
    title: "Planning Your Activities",
    subtitle: "Activities are scheduled around your hotel. Ask to swap days, add more, or cut costs.",
  },
  transportation: {
    title: "Arranging Transportation",
    subtitle: "Transport is planned between each activity. Ask to use cheaper options or specific providers.",
  },
  done: { title: "All Done!", subtitle: "Redirecting to your full trip plan..." },
};

export default function PipelinePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { sessionId: storedSessionId, resetTrip } = useTripStore();
  const { currentPhase, phases } = usePipelineStore();
  const { isDone, isError, isSessionNotFound, resumePolling } = usePipelinePolling(sessionId);

  useEffect(() => {
    if (!sessionId) router.push("/plan");
  }, [sessionId, router]);

  useEffect(() => {
    if (isSessionNotFound) {
      resetTrip();
      router.push("/plan");
    }
  }, [isSessionNotFound, resetTrip, router]);

  useEffect(() => {
    if (isDone) {
      router.push(`/results/${sessionId}`);
    }
  }, [isDone, sessionId, router]);

  const phaseInfo = PHASE_TITLES[currentPhase] || PHASE_TITLES["accommodation"];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-brand-parchment px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <PhaseProgressBar currentPhase={currentPhase} phases={phases} />

          <div className="text-center mb-8">
            <h1 className="text-2xl font-serif font-bold text-brand-night mb-1">{phaseInfo.title}</h1>
            <p className="text-brand-night/50 text-sm">{phaseInfo.subtitle}</p>
          </div>

          {currentPhase === "accommodation" && (
            <AccommodationPhasePanel
              sessionId={sessionId}
              onConfirmed={resumePolling}
              resumePolling={resumePolling}
            />
          )}
          {currentPhase === "activities" && (
            <ActivitiesPhasePanel
              sessionId={sessionId}
              onConfirmed={resumePolling}
              resumePolling={resumePolling}
            />
          )}
          {currentPhase === "transportation" && (
            <TransportPhasePanel
              sessionId={sessionId}
              onConfirmed={resumePolling}
              resumePolling={resumePolling}
            />
          )}

          {isError && (
            <div className="text-center mt-8">
              <p className="text-red-500 text-sm mb-4">Connection lost. Please check your network.</p>
              <button
                onClick={() => resumePolling()}
                className="px-6 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
