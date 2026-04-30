"use client";

import { Building2, Compass, Car, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PHASES = [
  { id: "accommodation", label: "Accommodation", Icon: Building2 },
  { id: "activities", label: "Activities", Icon: Compass },
  { id: "transportation", label: "Transport", Icon: Car },
] as const;

interface Props {
  currentPhase: string;
  phases: Record<string, { status: string }>;
}

export function PhaseProgressBar({ currentPhase, phases }: Props) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {PHASES.map((phase, i) => {
        const state = phases[phase.id];
        const isConfirmed = state?.status === "confirmed";
        const isCurrent = currentPhase === phase.id;
        const isPast = isConfirmed;
        const isFuture = !isCurrent && !isPast;

        return (
          <div key={phase.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isPast && "bg-emerald-500 border-emerald-500 text-white",
                  isCurrent && "bg-brand-sand border-brand-sand text-brand-night",
                  isFuture && "bg-white border-gray-200 text-gray-400"
                )}
              >
                {isPast ? <Check className="w-5 h-5" /> : <phase.Icon className="w-5 h-5" />}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCurrent && "text-brand-night",
                  isPast && "text-emerald-600",
                  isFuture && "text-gray-400"
                )}
              >
                {phase.label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div
                className={cn(
                  "w-16 h-0.5 mx-2 mb-5 transition-all",
                  isPast ? "bg-emerald-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
