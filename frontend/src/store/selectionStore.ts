import { create } from "zustand";
import type { TransportCategory } from "@/types/transport";

interface SelectionState {
  selectedAccommodationId: string | null;
  selectedTransportIds: Partial<Record<TransportCategory, string>>;
  selectedActivityIds: string[];
  selectAccommodation: (id: string) => void;
  selectTransport: (category: TransportCategory, id: string) => void;
  toggleActivity: (id: string) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selectedAccommodationId: null,
  selectedTransportIds: {},
  selectedActivityIds: [],

  selectAccommodation: (id) => set({ selectedAccommodationId: id }),

  selectTransport: (category, id) =>
    set((s) => ({
      selectedTransportIds: { ...s.selectedTransportIds, [category]: id },
    })),

  toggleActivity: (id) =>
    set((s) => ({
      selectedActivityIds: s.selectedActivityIds.includes(id)
        ? s.selectedActivityIds.filter((a) => a !== id)
        : [...s.selectedActivityIds, id],
    })),

  clearSelections: () =>
    set({
      selectedAccommodationId: null,
      selectedTransportIds: {},
      selectedActivityIds: [],
    }),
}));
