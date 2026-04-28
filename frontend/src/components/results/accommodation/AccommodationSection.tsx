"use client";

import { useState } from "react";
import type { AccommodationAgentResult, AccommodationOption } from "@/types/accommodation";
import { useSelectionStore } from "@/store/selectionStore";
import { SectionHeader } from "../shared/SectionHeader";
import { StarRating } from "../shared/StarRating";
import { Building2, MapPin, Check, Star } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  result: AccommodationAgentResult;
}

const TYPE_BADGE: Record<string, string> = {
  hotel: "bg-indigo-100 text-indigo-700",
  apartment: "bg-emerald-100 text-emerald-700",
  chalet: "bg-amber-100 text-amber-700",
  villa: "bg-purple-100 text-purple-700",
};

function AccommodationCard({ option, isSelected, onSelect }: {
  option: AccommodationOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-white overflow-hidden transition-all cursor-pointer hover:shadow-md",
        isSelected ? "border-brand-sand shadow-md shadow-brand-sand/10" : "border-gray-100"
      )}
      onClick={() => onSelect(option.id)}
    >
      <div className="h-36 bg-gradient-to-br from-brand-sand/20 to-brand-dune/20 relative overflow-hidden">
        {option.images[0] && (
          <img src={option.images[0]} alt={option.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold capitalize", TYPE_BADGE[option.type] || "bg-gray-100 text-gray-700")}>
            {option.type}
          </span>
          {option.recommended && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-sand text-brand-night flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Top Pick
            </span>
          )}
        </div>
        {isSelected && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-brand-sand flex items-center justify-center">
            <Check className="w-4 h-4 text-brand-night" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-semibold text-brand-night text-sm leading-tight">{option.name}</h4>
          <div className="text-right shrink-0 ml-2">
            <p className="font-bold text-brand-dune">{formatCurrency(option.pricePerNight, option.currency)}</p>
            <p className="text-xs text-brand-night/40">/night</p>
          </div>
        </div>
        <StarRating rating={option.starRating} />
        <div className="flex items-center gap-1 text-xs text-brand-night/50 mt-1.5 mb-3">
          <MapPin className="w-3 h-3" />
          <span>{option.location.distanceFromCenter} km from center</span>
          <span className="ml-auto font-semibold text-brand-night">{option.rating}/10</span>
          <span className="text-brand-night/30">({option.reviewCount.toLocaleString()})</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {option.amenities.slice(0, 4).map((a) => (
            <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-brand-night/60">{a}</span>
          ))}
          {option.amenities.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-brand-night/40">+{option.amenities.length - 4} more</span>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-brand-night/50">Total ({Math.round(option.totalPrice / option.pricePerNight)} nights)</span>
          <span className="font-bold text-brand-night">{formatCurrency(option.totalPrice, option.currency)}</span>
        </div>
      </div>
    </div>
  );
}

export function AccommodationSection({ result }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const { selectedAccommodationId, selectAccommodation } = useSelectionStore();

  const filtered = filter === "all"
    ? result.options
    : result.options.filter((o) => o.type === filter);

  const types = ["all", ...Array.from(new Set(result.options.map((o) => o.type)))];

  return (
    <section id="accommodation" className="space-y-6">
      <SectionHeader
        Icon={Building2}
        title="Accommodation"
        subtitle={result.recommendation}
        badge={`${result.options.length} options`}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize",
              filter === t
                ? "border-brand-sand bg-brand-sand text-brand-night"
                : "border-gray-200 text-brand-night/60 hover:border-brand-sand/40"
            )}
          >
            {t === "all" ? "All" : t}
          </button>
        ))}
        <span className="ml-auto text-xs text-brand-night/40">
          Budget: {formatCurrency(result.budgetAllocated, result.currency)}
        </span>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((opt) => (
          <AccommodationCard
            key={opt.id}
            option={opt}
            isSelected={selectedAccommodationId === opt.id}
            onSelect={selectAccommodation}
          />
        ))}
      </div>
    </section>
  );
}
