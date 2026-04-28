"use client";

import { useState } from "react";
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
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-brand-night text-sm">{option.provider}</p>
            {option.recommended && (
              <span className="px-2 py-0.5 rounded-full bg-brand-sand text-brand-night text-[10px] font-bold flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" /> Best
              </span>
            )}
          </div>
          <p className="text-xs text-brand-night/50">{option.description}</p>
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
        {option.features.slice(0, 3).map((f) => (
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
  const [activeTab, setActiveTab] = useState<TransportCategory>(categories[0]);
  const { selectedTransportIds, selectTransport } = useSelectionStore();

  return (
    <section id="transport" className="space-y-6">
      <SectionHeader
        Icon={Car}
        title="Transportation"
        subtitle={result.recommendation}
        badge={`${Object.values(result.options).flat().length} options`}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all shrink-0",
              activeTab === cat
                ? "border-brand-sand bg-brand-sand text-brand-night"
                : "border-gray-200 text-brand-night/60 hover:border-brand-sand/40"
            )}
          >
            {TRANSPORT_LABELS[cat]}
            <span className="ml-1.5 text-xs opacity-60">({result.options[cat].length})</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-brand-night/40 shrink-0 self-center pr-1">
          Budget: {formatCurrency(result.budgetAllocated, result.currency)}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {result.options[activeTab].map((opt) => (
          <TransportCard
            key={opt.id}
            option={opt}
            isSelected={selectedTransportIds[activeTab] === opt.id}
            onSelect={() => selectTransport(activeTab, opt.id)}
          />
        ))}
      </div>
    </section>
  );
}
