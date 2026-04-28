import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TripFormData } from "@/types/trip";

interface TripState {
  formData: Partial<TripFormData>;
  currentStep: number;
  sessionId: string | null;
  setStepData: (data: Partial<TripFormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSessionId: (id: string) => void;
  resetTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      formData: {},
      currentStep: 0,
      sessionId: null,
      setStepData: (data) =>
        set((s) => ({ formData: { ...s.formData, ...data } })),
      nextStep: () => set((s) => ({ currentStep: s.currentStep + 1 })),
      prevStep: () =>
        set((s) => ({ currentStep: Math.max(0, s.currentStep - 1) })),
      setSessionId: (id) => set({ sessionId: id }),
      resetTrip: () => set({ formData: {}, currentStep: 0, sessionId: null }),
    }),
    { name: "travellin-trip" }
  )
);
