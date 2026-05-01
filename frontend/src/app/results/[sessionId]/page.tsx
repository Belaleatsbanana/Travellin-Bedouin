"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchFullResults } from "@/lib/api/trip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import dynamic from "next/dynamic";
import { TripSummaryHeader } from "@/components/results/TripSummaryHeader";
const BudgetBreakdownChart = dynamic(
  () => import("@/components/results/BudgetBreakdownChart").then((m) => m.BudgetBreakdownChart),
  { ssr: false }
);
import { AccommodationSection } from "@/components/results/accommodation/AccommodationSection";
import { DayTimeline } from "@/components/results/DayTimeline";
import { useSelectionStore } from "@/store/selectionStore";
import { Loader2, Building2, Car, Wallet } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { DaySchedule, ScheduledSlot, ActivitiesAgentResult } from "@/types/activities";
import type { TransportAgentResult, DayLegs } from "@/types/transport";
import type { AccommodationAgentResult } from "@/types/accommodation";

// Time slots to assign when rebuilding schedule from selections
const DAY_SLOTS: [string, string][] = [
  ["09:00", "12:00"],
  ["14:00", "17:00"],
  ["19:00", "21:00"],
  ["07:30", "10:30"],
  ["11:00", "14:00"],
];

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [activeDay, setActiveDay] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["full-results", sessionId],
    queryFn: () => fetchFullResults(sessionId),
    enabled: !!sessionId,
    staleTime: Infinity,
    retry: false,
  });

  const {
    selectedAccommodationId,
    selectedTransportIds,
    selectedActivityIds,
  } = useSelectionStore();

  const isNotFound = (error as (Error & { status?: number }) | null)?.status === 404;

  useEffect(() => {
    if (isError && isNotFound) router.push("/plan");
  }, [isError, isNotFound, router]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex items-center justify-center bg-brand-parchment">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand-sand mx-auto mb-4" />
            <p className="text-brand-night/50">Loading your trip plan...</p>
          </div>
        </main>
      </>
    );
  }

  if (isError && !isNotFound) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex items-center justify-center bg-brand-parchment">
          <div className="text-center space-y-4">
            <p className="text-red-500">Failed to load your trip plan.</p>
            <button
              onClick={() => router.push("/plan")}
              className="px-6 py-2 rounded-lg bg-brand-sand text-brand-night font-medium hover:bg-brand-dune transition-colors"
            >
              Start a new plan
            </button>
          </div>
        </main>
      </>
    );
  }

  const budget = data?.budget;
  const formData = data?.formData as any;
  const accommodation = data?.accommodation as AccommodationAgentResult | undefined;
  const activities = data?.activities as ActivitiesAgentResult | undefined;
  const transport = data?.transport as TransportAgentResult | undefined;

  const confirmedOption =
    accommodation?.options?.find((o) => o.id === selectedAccommodationId) ||
    (accommodation as any)?.confirmed_option ||
    accommodation?.options?.[0] ||
    null;

  // ── Actual costs from user selections ────────────────────────────────────

  const actualAccCost = (() => {
    if (selectedAccommodationId && accommodation?.options) {
      const opt = accommodation.options.find((o) => o.id === selectedAccommodationId);
      if (opt) return opt.totalPrice;
    }
    return budget?.accommodationTotal ?? 0;
  })();

  const actualTransportCost = (() => {
    if (transport && Object.keys(selectedTransportIds).length > 0) {
      const allOptions = Object.values(transport.options).flat();
      return Object.values(selectedTransportIds).reduce((sum, id) => {
        const opt = allOptions.find((o) => o.id === id);
        return sum + (opt?.priceTotal ?? 0);
      }, 0);
    }
    return budget?.transportTotal ?? 0;
  })();

  const selectedActivities = useMemo(
    () => (activities?.activities ?? []).filter((a) => selectedActivityIds.includes(a.id)),
    [activities, selectedActivityIds],
  );

  const actualActivitiesCost = selectedActivities.reduce((s, a) => s + a.price, 0) ||
    budget?.activitiesTotal || 0;

  // ── Rebuild schedule from selected activities, evenly distributed ─────────

  const rebuiltSchedule: DaySchedule[] = useMemo(() => {
    const dayMeta = activities?.schedule ?? [];
    if (!dayMeta.length) return [];

    // If no selections yet, fall back to the backend-generated schedule
    if (!selectedActivityIds.length) return dayMeta;

    const n = selectedActivities.length;
    const d = dayMeta.length;
    const base = Math.floor(n / d);
    const extras = n % d;

    let cursor = 0;
    return dayMeta.map((day, i) => {
      const count = base + (i < extras ? 1 : 0);
      const dayActs = selectedActivities.slice(cursor, cursor + count);
      cursor += count;

      const slots: ScheduledSlot[] = dayActs.map((act, j) => {
        const [startTime, endTime] = DAY_SLOTS[j % DAY_SLOTS.length];
        return {
          startTime,
          endTime,
          type: "activity" as const,
          activityId: act.id,
          activityName: act.name,
          locationName: act.location,
          coordinates: act.coordinates,
        };
      });

      return { day: day.day, date: day.date, slots, freeTime: day.freeTime };
    });
  }, [selectedActivityIds, selectedActivities, activities]);

  const dailyLegs: DayLegs[] = transport?.dailyLegs || [];

  const activeDaySchedule = rebuiltSchedule.find((d) => d.day === activeDay);
  const activeDayLegs = dailyLegs.find((d) => d.day === activeDay);

  // ── Budget chart — use actual selection costs ─────────────────────────────

  const totalBudget = budget?.totalBudget ?? 0;
  const contingency = Math.max(0, totalBudget - actualAccCost - actualTransportCost - actualActivitiesCost);

  const budgetChartData = budget
    ? {
        totalBudget,
        currency: budget.currency,
        breakdown: {
          accommodation: actualAccCost,
          transportation: actualTransportCost,
          activities: actualActivitiesCost,
          visa_insurance: 0,
          contingency,
        },
        percentages: {
          accommodation: totalBudget ? Math.round((actualAccCost / totalBudget) * 100) : 0,
          transportation: totalBudget ? Math.round((actualTransportCost / totalBudget) * 100) : 0,
          activities: totalBudget ? Math.round((actualActivitiesCost / totalBudget) * 100) : 0,
          visa_insurance: 0,
          contingency: totalBudget
            ? Math.max(0, 100 - Math.round(((actualAccCost + actualTransportCost + actualActivitiesCost) / totalBudget) * 100))
            : 0,
        },
        sources: [],
      }
    : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-brand-parchment">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          {formData && budget && (
            <TripSummaryHeader
              formData={formData}
              totalBudget={totalBudget}
              currency={budget.currency}
            />
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-1 space-y-4">
              {budgetChartData && <BudgetBreakdownChart allocation={budgetChartData} />}

              {/* Confirmed accommodation card */}
              {confirmedOption && (
                <div className="bg-white rounded-2xl border border-brand-sand/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-brand-night/60 text-xs font-semibold uppercase tracking-wide">
                    <Building2 className="w-3.5 h-3.5" />
                    Accommodation
                  </div>
                  <p className="font-semibold text-brand-night">{confirmedOption.name}</p>
                  <p className="text-xs text-brand-night/50">{confirmedOption.location?.address}</p>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-brand-night/50">{formData?.durationNights} nights</span>
                    <span className="font-bold text-brand-dune">
                      {formatCurrency(actualAccCost, budget?.currency ?? "USD")}
                    </span>
                  </div>
                </div>
              )}

              {/* Budget totals */}
              {budget && (
                <div className="bg-white rounded-2xl border border-brand-sand/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-brand-night/60 text-xs font-semibold uppercase tracking-wide">
                    <Wallet className="w-3.5 h-3.5" />
                    Confirmed Spend
                  </div>
                  {[
                    { label: "Accommodation", value: actualAccCost },
                    { label: "Activities", value: actualActivitiesCost },
                    { label: "Transport", value: actualTransportCost },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-brand-night/60">{label}</span>
                      <span className="font-semibold">{formatCurrency(value, budget.currency)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-brand-dune">
                      {formatCurrency(actualAccCost + actualActivitiesCost + actualTransportCost, budget.currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right column — day-by-day timeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-brand-sand/20 overflow-hidden">
                {/* Day tabs */}
                <div className="flex items-center gap-0 overflow-x-auto border-b border-gray-100 px-2">
                  {rebuiltSchedule.map((day) => (
                    <button
                      key={day.day}
                      onClick={() => setActiveDay(day.day)}
                      className={cn(
                        "shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                        activeDay === day.day
                          ? "border-brand-sand text-brand-night"
                          : "border-transparent text-brand-night/40 hover:text-brand-night/70"
                      )}
                    >
                      <span className="block text-xs text-brand-night/40">Day {day.day}</span>
                      <span className="text-xs">
                        {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Day content */}
                <div className="p-6">
                  {activeDaySchedule ? (
                    <>
                      <DayTimeline
                        slots={activeDaySchedule.slots}
                        legs={activeDayLegs?.legs || []}
                        currency={budget?.currency || "USD"}
                      />
                      {activeDaySchedule.freeTime && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-semibold text-brand-night/40 uppercase tracking-wide mb-1">
                            Free Time
                          </p>
                          <p className="text-sm text-brand-night/60">{activeDaySchedule.freeTime}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-brand-night/40">No schedule for this day.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
