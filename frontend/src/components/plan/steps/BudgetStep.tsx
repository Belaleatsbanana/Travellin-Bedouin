"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TripFormData, Currency } from "@/types/trip";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "SAR", "AED", "EGP", "JPY"];

const schema = z.object({
  totalBudget: z.number().min(500, "Minimum budget is 500").max(1_000_000),
  currency: z.enum(["USD", "EUR", "GBP", "SAR", "AED", "EGP", "JPY"] as const),
});

type FormValues = z.infer<typeof schema>;

const ALLOCATION = [
  { label: "Accommodation", pct: 35, color: "bg-indigo-400" },
  { label: "Transportation", pct: 15, color: "bg-amber-400" },
  { label: "Activities", pct: 20, color: "bg-emerald-400" },
  { label: "Visa & Insurance", pct: 5, color: "bg-blue-400" },
  { label: "Contingency", pct: 25, color: "bg-gray-300" },
];

interface Props {
  defaultValues: Partial<TripFormData>;
  onNext: (data: Partial<TripFormData>) => void;
  onBack: () => void;
}

export function BudgetStep({ defaultValues, onNext, onBack }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      totalBudget: defaultValues.totalBudget || 5000,
      currency: defaultValues.currency || "USD",
    },
  });

  const budget = watch("totalBudget") || 0;
  const currency = watch("currency");

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold text-brand-night mb-1">What is your total budget?</h2>
        <p className="text-sm text-brand-night/50 mb-6">Our Budget Agent will allocate this across all categories.</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-brand-night mb-1.5">Total budget</label>
          <input
            type="number"
            {...register("totalBudget", { valueAsNumber: true })}
            min={500}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-sand"
          />
          {errors.totalBudget && <p className="text-xs text-red-500 mt-1">{errors.totalBudget.message}</p>}
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-brand-night mb-1.5">Currency</label>
          <select
            {...register("currency")}
            className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
          >
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-brand-sand/10 border border-brand-sand/20 rounded-xl p-4">
        <div className="flex items-center gap-1.5 text-xs text-brand-dune font-medium mb-3">
          <Info className="w-3.5 h-3.5" /> Estimated allocation preview
        </div>
        <div className="flex rounded-full overflow-hidden h-3 mb-3">
          {ALLOCATION.map(({ pct, color }) => (
            <div key={pct + color} className={`${color} h-full`} style={{ width: `${pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 text-xs">
          {ALLOCATION.map(({ label, pct, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className="text-brand-night/60">{label}</span>
              <span className="ml-auto font-semibold text-brand-night">
                {currency} {Math.round((pct / 100) * budget).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-brand-night/70 hover:border-brand-sand transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-night text-white font-semibold hover:bg-brand-night/90 transition-colors">
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
