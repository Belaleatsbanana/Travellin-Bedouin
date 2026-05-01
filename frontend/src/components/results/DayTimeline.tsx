"use client";

import { Footprints, Car, Train, MapPin, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { ScheduledSlot } from "@/types/activities";
import type { TransportLeg, TransportMode } from "@/types/transport";
import { MODE_LABELS } from "@/types/transport";

const MODE_ICONS: Record<TransportMode, React.ElementType> = {
  walk: Footprints,
  metro: Train,
  uber: Car,
  taxi: Car,
  rental_car: Car,
  bus: Train,
  dedicated_driver: Car,
};

const MODE_COLORS: Record<TransportMode, string> = {
  walk: "text-emerald-500 bg-emerald-50",
  metro: "text-blue-500 bg-blue-50",
  uber: "text-black bg-gray-100",
  taxi: "text-yellow-600 bg-yellow-50",
  rental_car: "text-indigo-500 bg-indigo-50",
  bus: "text-purple-500 bg-purple-50",
  dedicated_driver: "text-brand-dune bg-brand-sand/20",
};

interface TimelineItem {
  type: "activity" | "transport";
  time: string;
  data: ScheduledSlot | TransportLeg;
}

interface Props {
  slots: ScheduledSlot[];
  legs: TransportLeg[];
  currency: string;
}

export function DayTimeline({ slots, legs, currency }: Props) {
  // Merge slots and legs sorted by start time
  const items: TimelineItem[] = [
    ...slots.map((s) => ({ type: "activity" as const, time: s.startTime, data: s })),
    ...legs.map((l) => ({ type: "transport" as const, time: l.fromTime, data: l })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (items.length === 0) {
    return <p className="text-sm text-brand-night/40 py-4">Free day — explore at your own pace.</p>;
  }

  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        if (item.type === "activity") {
          const slot = item.data as ScheduledSlot;
          return (
            <div key={i} className="flex gap-3">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-brand-sand border-2 border-brand-dune mt-1 shrink-0" />
                {!isLast && <div className="w-0.5 bg-gray-200 flex-1 my-1" />}
              </div>
              {/* Content */}
              <div className="pb-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-brand-night/40 font-mono">
                      {slot.startTime} – {slot.endTime}
                    </p>
                    <p className="font-semibold text-brand-night text-sm">{slot.activityName}</p>
                    <div className="flex items-center gap-1 text-xs text-brand-night/50 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{slot.locationName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        const leg = item.data as TransportLeg;
        const Icon = MODE_ICONS[leg.mode] || Car;
        const colorClass = MODE_COLORS[leg.mode] || "text-gray-500 bg-gray-100";

        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0", colorClass)}>
                <Icon className="w-3 h-3" />
              </div>
              {!isLast && <div className="w-0.5 bg-gray-100 flex-1 my-1" />}
            </div>
            <div className="pb-3 flex-1">
              <div className="flex items-center gap-2 text-xs text-brand-night/50">
                <span className="font-mono">{leg.fromTime}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", colorClass)}>
                  {MODE_LABELS[leg.mode]}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {leg.durationMinutes} min
                </span>
                {leg.estimatedCost > 0 && (
                  <span>· {formatCurrency(leg.estimatedCost, currency)}</span>
                )}
              </div>
              {leg.notes && (
                <p className="text-xs text-brand-night/40 mt-0.5 italic">{leg.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
