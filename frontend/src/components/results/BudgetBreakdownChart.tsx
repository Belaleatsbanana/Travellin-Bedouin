"use client";

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

  return (
    <div className="bg-white rounded-2xl border border-brand-sand/20 p-6">
      <h3 className="font-serif font-semibold text-brand-night mb-4">Budget Breakdown</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-48 h-48 shrink-0">
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

        <div className="flex-1 space-y-2.5 w-full">
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
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-brand-night">Total Budget</span>
            <span className="text-sm font-bold text-brand-dune">
              {formatCurrency(allocation.totalBudget, allocation.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
