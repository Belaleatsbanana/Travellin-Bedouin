"use client";

import type { TransportAgentResult, TransportCategory, TransportOption } from "@/types/transport";
import { TRANSPORT_LABELS } from "@/types/transport";
import { useSelectionStore } from "@/store/selectionStore";
import { SectionHeader } from "../shared/SectionHeader";
import { Car, Check, Star } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const PRICING_LABEL: Record<string, string> = {
  per_day: "/day",
  fixed: " total",
  per_trip: "/trip",
  per_person: "/person",
};

const CATEGORY_ICONS: Record<TransportCategory, string> = {
  rental_car: "🚗",
  dedicated_driver: "🧑‍✈️",
  metro_pass: "🚇",
  uber_estimate: "📱",
  minibus: "🚌",
};

function TransportCard({ option, isSelected, onSelect }: {
  option: TransportOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-xl border-2 bg-white p-4 cursor-pointer transition-all hover:shadow-sm",
        isSelected ? "border-brand-sand bg-brand-sand/5" : "border-gray-100"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-brand-night text-sm truncate">{option.provider}</p>
            {option.recommended && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-brand-sand text-brand-night text-[10px] font-bold flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" /> Best
              </span>
            )}
          </div>
          <p className="text-xs text-brand-night/50 line-clamp-2">{option.description}</p>
        </div>
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-brand-sand flex items-center justify-center shrink-0 ml-2">
            <Check className="w-3.5 h-3.5 text-brand-night" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-xl font-bold text-brand-dune">{formatCurrency(option.priceTotal, option.currency)}</span>
          <span className="text-xs text-brand-night/40 ml-1">total</span>
        </div>
        <span className="text-xs text-brand-night/40">
          {formatCurrency(option.priceUnit, option.currency)}{PRICING_LABEL[option.pricingModel]}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {option.features?.slice(0, 3).map((f) => (
          <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-brand-night/60">{f}</span>
        ))}
      </div>
    </div>
  );
}

interface Props {
  result: TransportAgentResult;
}

export function TransportSection({ result }: Props) {
  const categories = Object.keys(result.options) as TransportCategory[];
  const { selectedTransportIds, selectTransport } = useSelectionStore();

  const totalOptions = Object.values(result.options).flat().length;

  return (
    <section id="transport" className="space-y-6">
      <SectionHeader
        Icon={Car}
        title="Transportation"
        subtitle={result.recommendation}
        badge={`${totalOptions} options`}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-night/40">Select one option per category</p>
        <span className="text-xs text-brand-night/40">
          Budget: {formatCurrency(result.budgetAllocated, result.currency)}
        </span>
      </div>

      {/* One section per transport category, stacked vertically */}
      <div className="flex flex-col gap-8">
        {categories.map((cat) => {
          const options = result.options[cat];
          if (!options || options.length === 0) return null;
          return (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-gray-200">
                <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                <div>
                  <h3 className="font-semibold text-brand-night text-base">{TRANSPORT_LABELS[cat]}</h3>
                  <p className="text-xs text-brand-night/40">{options.length} option{options.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {/* Cards in a responsive row — min-width keeps them readable */}
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {options.map((opt) => (
                  <TransportCard
                    key={opt.id}
                    option={opt}
                    isSelected={selectedTransportIds[cat] === opt.id}
                    onSelect={() => selectTransport(cat, opt.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
