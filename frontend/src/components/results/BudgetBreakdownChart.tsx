"use client";

// frontend/src/components/results/BudgetBreakdownChart.tsx
// Displays the pie chart + breakdown table produced by the Budget Agent.
// Shows AI citation sources when they are returned by the real backend.

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { BudgetAllocation } from "@/types/budget";
import { formatCurrency } from "@/lib/utils";

const COLORS = {
  accommodation: "#6366f1",
  transportation: "#f59e0b",
  activities: "#10b981",
  visa_insurance: "#3b82f6",
  contingency: "#9ca3af",
};

const LABELS: Record<string, string> = {
  accommodation: "Accommodation",
  transportation: "Transportation",
  activities: "Activities",
  visa_insurance: "Visa & Insurance",
  contingency: "Contingency",
};

interface Props {
  allocation: BudgetAllocation;
  selectedAccCost?: number;
  selectedTransportCost?: number;
  selectedActivitiesCost?: number;
}

export function BudgetBreakdownChart({ allocation }: Props) {
  const data = Object.entries(allocation.breakdown).map(([key, value]) => ({
    name: LABELS[key] || key,
    value,
    key,
    pct: allocation.percentages[key as keyof typeof allocation.percentages],
  }));

  const hasSources = allocation.sources && allocation.sources.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-brand-sand/20 p-6 space-y-4">
      <h3 className="font-serif font-semibold text-brand-night">Budget Breakdown</h3>

      {/* ── Pie chart ─────────────────────────────────────────────── */}
      <div className="w-48 h-48 mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map(({ key }) => (
                <Cell key={key} fill={COLORS[key as keyof typeof COLORS] || "#ccc"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatCurrency(v, allocation.currency)}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {data.map(({ key, name, value, pct }) => (
          <div key={key} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: COLORS[key as keyof typeof COLORS] || "#ccc" }}
            />
            <span className="text-sm text-brand-night/70 flex-1">{name}</span>
            <span className="text-xs text-brand-night/40">{pct}%</span>
            <span className="text-sm font-semibold text-brand-night">
              {formatCurrency(value, allocation.currency)}
            </span>
          </div>
        ))}

        {/* Total row */}
        <div className="border-t border-gray-100 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-brand-night">Total Budget</span>
          <span className="text-sm font-bold text-brand-dune">
            {formatCurrency(allocation.totalBudget, allocation.currency)}
          </span>
        </div>
      </div>

      {/* ── AI sources — only visible when the real backend is running ── */}
      {hasSources && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-brand-night/40 uppercase tracking-wide mb-2">
            AI Research Sources
          </p>
          <ul className="space-y-1">
            {allocation.sources!.map((src, i) => (
              <li key={i} className="text-xs text-brand-night/60 flex items-start gap-1.5">
                <span className="text-brand-sand mt-0.5">•</span>
                {src}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
