"use client";

import { create } from "zustand";
import type { PipelinePhase, PipelineStatus, PhaseState, ChatMessage } from "@/types/pipeline";
import type { AccommodationAgentResult } from "@/types/accommodation";
import type { ActivitiesAgentResult } from "@/types/activities";
import type { TransportAgentResult } from "@/types/transport";

interface PipelineStore {
  overallStatus: PipelineStatus;
  currentPhase: string;
  phases: Record<string, PhaseState>;
  chatHistories: Record<string, ChatMessage[]>;
  accommodationResult: AccommodationAgentResult | null;
  activitiesResult: ActivitiesAgentResult | null;
  transportResult: TransportAgentResult | null;

  setOverallStatus: (s: PipelineStatus) => void;
  setCurrentPhase: (p: string) => void;
  updatePhase: (phase: string, patch: Partial<PhaseState>) => void;
  appendChatMessage: (phase: string, msg: ChatMessage) => void;
  setAccommodationResult: (r: AccommodationAgentResult) => void;
  setActivitiesResult: (r: ActivitiesAgentResult) => void;
  setTransportResult: (r: TransportAgentResult) => void;
  reset: () => void;
}

const defaultPhase = (id: string): PhaseState => ({
  phaseId: id as PipelinePhase,
  status: "pending",
  progress: 0,
  thoughts: [],
  hasResult: false,
  startedAt: null,
  completedAt: null,
});

export const usePipelineStore = create<PipelineStore>()((set) => ({
  overallStatus: "initializing",
  currentPhase: "accommodation",
  phases: {
    accommodation: defaultPhase("accommodation"),
    activities: defaultPhase("activities"),
    transportation: defaultPhase("transportation"),
  },
  chatHistories: { accommodation: [], activities: [], transportation: [] },
  accommodationResult: null,
  activitiesResult: null,
  transportResult: null,

  setOverallStatus: (s) => set({ overallStatus: s }),
  setCurrentPhase: (p) => set({ currentPhase: p }),

  updatePhase: (phase, patch) =>
    set((s) => ({
      phases: {
        ...s.phases,
        [phase]: { ...s.phases[phase], ...patch },
      },
    })),

  appendChatMessage: (phase, msg) =>
    set((s) => ({
      chatHistories: {
        ...s.chatHistories,
        [phase]: [...(s.chatHistories[phase] || []), msg],
      },
    })),

  setAccommodationResult: (r) => set({ accommodationResult: r }),
  setActivitiesResult: (r) => set({ activitiesResult: r }),
  setTransportResult: (r) => set({ transportResult: r }),

  reset: () =>
    set({
      overallStatus: "initializing",
      currentPhase: "accommodation",
      phases: {
        accommodation: defaultPhase("accommodation"),
        activities: defaultPhase("activities"),
        transportation: defaultPhase("transportation"),
      },
      chatHistories: { accommodation: [], activities: [], transportation: [] },
      accommodationResult: null,
      activitiesResult: null,
      transportResult: null,
    }),
}));
