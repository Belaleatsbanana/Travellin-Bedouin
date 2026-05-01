"use client";

import { useState } from "react";
import type { ActivitiesAgentResult, Activity } from "@/types/activities";
import { DURATION_LABELS } from "@/types/activities";
import { useSelectionStore } from "@/store/selectionStore";
import { SectionHeader } from "../shared/SectionHeader";
import { Sparkles, Clock, MapPin, Star, Check, AlertTriangle, Info } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  culture:   "bg-indigo-100 text-indigo-700",
  food:      "bg-orange-100 text-orange-700",
  nature:    "bg-green-100 text-green-700",
  adventure: "bg-red-100 text-red-700",
  nightlife: "bg-purple-100 text-purple-700",
  shopping:  "bg-pink-100 text-pink-700",
  wellness:  "bg-teal-100 text-teal-700",
  sports:    "bg-blue-100 text-blue-700",
  art:       "bg-yellow-100 text-yellow-700",
  history:   "bg-amber-100 text-amber-700",
  beach:     "bg-cyan-100 text-cyan-700",
};

/** Spread N activities evenly across D days. Returns count per day index. */
function buildDayDistribution(selectedCount: number, days: number): number[] {
  if (days <= 0) return [];
  const base = Math.floor(selectedCount / days);
  const extras = selectedCount % days;
  return Array.from({ length: days }, (_, i) => base + (i < extras ? 1 : 0));
}

function DayDistributionPreview({ selectedCount, durationNights }: {
  selectedCount: number;
  durationNights: number;
}) {
  const distribution = buildDayDistribution(selectedCount, durationNights);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
      <p className="text-xs font-semibold text-brand-night/60 uppercase tracking-wide">
        Day-by-day distribution preview
      </p>
      <div className="flex flex-wrap gap-2">
        {distribution.map((count, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center rounded-lg px-3 py-2 min-w-[60px] text-center transition-all",
              count === 0
                ? "bg-white border border-gray-200 text-brand-night/30"
                : count === 1
                ? "bg-blue-50 border border-blue-200 text-blue-700"
                : count === 2
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-amber-50 border border-amber-300 text-amber-700"
            )}
          >
            <span className="text-[10px] font-medium">Day {i + 1}</span>
            <span className="text-lg font-bold leading-tight">{count}</span>
            <span className="text-[9px] opacity-70">{count === 1 ? "activity" : "activities"}</span>
          </div>
        ))}
      </div>
      {selectedCount > 0 && (
        <p className="text-[10px] text-brand-night/40">
          Activities are distributed evenly — exact schedule is generated automatically.
        </p>
      )}
    </div>
  );
}

function ActivityCard({ activity, isSelected, onToggle, isAtMax }: {
  activity: Activity;
  isSelected: boolean;
  onToggle: (id: string) => void;
  isAtMax: boolean;
}) {
  const blocked = isAtMax && !isSelected;
  return (
    <div
      onClick={() => !blocked && onToggle(activity.id)}
      className={cn(
        "rounded-2xl border-2 bg-white overflow-hidden transition-all",
        blocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-sm",
        isSelected ? "border-brand-sand shadow-sm shadow-brand-sand/10" : "border-gray-100"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-1.5 flex-wrap max-w-[75%]">
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize", CATEGORY_COLORS[activity.category] || "bg-gray-100 text-gray-700")}>
              {activity.category}
            </span>
            {activity.recommended && (
              <span className="px-2 py-0.5 rounded-full bg-brand-sand text-brand-night text-[10px] font-bold flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" /> Pick
              </span>
            )}
            {activity.price === 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                FREE
              </span>
            )}
          </div>
          {isSelected && (
            <div className="w-7 h-7 rounded-full bg-brand-sand flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-brand-night" />
            </div>
          )}
        </div>
        <h4 className="font-semibold text-brand-night text-sm mb-1 leading-snug">{activity.name}</h4>
        <p className="text-xs text-brand-night/60 mb-3 line-clamp-3">{activity.description}</p>
        <div className="flex items-center gap-3 text-xs text-brand-night/50 mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{DURATION_LABELS[activity.duration]}</span>
          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{activity.location}</span>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-brand-sand text-brand-sand" />
            <span className="font-semibold text-brand-night">{activity.rating}</span>
            <span className="text-brand-night/30">({(activity.reviewCount ?? 0).toLocaleString()})</span>
          </div>
          <span className="font-bold text-brand-dune">
            {activity.price === 0
              ? "Free"
              : `${formatCurrency(activity.price, activity.currency)}/${activity.priceType === "per_person" ? "pp" : "group"}`}
          </span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  result: ActivitiesAgentResult;
  durationNights?: number;
}

export function ActivitiesSection({ result, durationNights = 7 }: Props) {
  const { selectedActivityIds, toggleActivity } = useSelectionStore();
  const [categoryFilter, setCategoryFilter] = useState("all");

  const recommendedMin = Math.max(1, durationNights);
  const recommendedMax = Math.round(durationNights * 2);
  const hardMax = durationNights * 3;

  const selectedCount = selectedActivityIds.length;
  const isOverRecommended = selectedCount > recommendedMax;
  const isAtMax = selectedCount >= hardMax;

  const categories = ["all", ...Array.from(new Set(result.activities.map((a) => a.category)))];

  const filtered = categoryFilter === "all"
    ? result.activities
    : result.activities.filter((a) => a.category === categoryFilter);

  const totalSelected = result.activities
    .filter((a) => selectedActivityIds.includes(a.id))
    .reduce((s, a) => s + a.price, 0);

  return (
    <section id="activities" className="space-y-5">
      <SectionHeader
        Icon={Sparkles}
        title="Activities"
        subtitle={result.recommendation}
        badge={`${result.activities.length} experiences`}
      />

      {/* Recommended range banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <span className="font-semibold">For {durationNights} {durationNights === 1 ? "day" : "days"}: </span>
          we recommend <span className="font-semibold">{recommendedMin}–{recommendedMax} activities</span> for a comfortable pace.
          Max is <span className="font-semibold">{hardMax}</span> (3 per day).
        </p>
      </div>

      {/* Day distribution preview — always visible, updates live */}
      <DayDistributionPreview selectedCount={selectedCount} durationNights={durationNights} />

      {/* Selection status bar */}
      {selectedCount > 0 && (
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3",
          isAtMax
            ? "bg-red-50 border border-red-200"
            : isOverRecommended
            ? "bg-amber-50 border border-amber-200"
            : "bg-emerald-50 border border-emerald-200"
        )}>
          <div className="flex items-center gap-2">
            {(isAtMax || isOverRecommended) && (
              <AlertTriangle className={cn("w-4 h-4 shrink-0", isAtMax ? "text-red-500" : "text-amber-500")} />
            )}
            <span className={cn(
              "font-medium",
              isAtMax ? "text-red-700" : isOverRecommended ? "text-amber-700" : "text-emerald-700"
            )}>
              {selectedCount} selected
              {isAtMax
                ? ` — limit reached (max ${hardMax})`
                : isOverRecommended
                ? ` — above recommended (${recommendedMax} for ${durationNights} days)`
                : ` of ${recommendedMax} recommended`}
            </span>
          </div>
          <span className={cn(
            "font-bold shrink-0",
            isAtMax ? "text-red-800" : isOverRecommended ? "text-amber-800" : "text-emerald-800"
          )}>
            {formatCurrency(totalSelected, result.currency)}
          </span>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize",
              categoryFilter === cat
                ? "border-brand-sand bg-brand-sand text-brand-night"
                : "border-gray-200 text-brand-night/60 hover:border-brand-sand/40"
            )}
          >
            {cat === "all" ? `All (${result.activities.length})` : cat}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((act) => (
          <ActivityCard
            key={act.id}
            activity={act}
            isSelected={selectedActivityIds.includes(act.id)}
            onToggle={toggleActivity}
            isAtMax={isAtMax}
          />
        ))}
      </div>
    </section>
  );
}
