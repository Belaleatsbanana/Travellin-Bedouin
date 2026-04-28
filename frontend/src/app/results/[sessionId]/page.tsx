"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTripStore } from "@/store/tripStore";
import { useAgentStore } from "@/store/agentStore";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TripSummaryHeader } from "@/components/results/TripSummaryHeader";
import { BudgetBreakdownChart } from "@/components/results/BudgetBreakdownChart";
import { VisaSection } from "@/components/results/visa/VisaSection";
import { AccommodationSection } from "@/components/results/accommodation/AccommodationSection";
import { TransportSection } from "@/components/results/transport/TransportSection";
import { ActivitiesSection } from "@/components/results/activities/ActivitiesSection";
import { Loader2 } from "lucide-react";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { formData } = useTripStore();
  const {
    budgetAllocation,
    visaResult,
    accommodationResult,
    transportResult,
    activitiesResult,
  } = useAgentStore();

  useEffect(() => {
    if (!budgetAllocation) {
      router.push("/plan");
    }
  }, [budgetAllocation, router]);

  if (!budgetAllocation || !visaResult || !accommodationResult || !transportResult || !activitiesResult) {
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

  const tripFormData = formData as Required<typeof formData>;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-brand-parchment">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          <TripSummaryHeader
            formData={tripFormData as any}
            totalBudget={budgetAllocation.totalBudget}
            currency={budgetAllocation.currency}
          />

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <BudgetBreakdownChart allocation={budgetAllocation} />
                <nav className="bg-white rounded-2xl border border-brand-sand/20 p-4 space-y-1">
                  <p className="text-xs font-semibold text-brand-night/40 uppercase tracking-wide mb-2">Jump to</p>
                  {["visa", "accommodation", "transport", "activities"].map((id) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="block px-3 py-2 rounded-lg text-sm text-brand-night/70 hover:bg-brand-sand/10 hover:text-brand-dune capitalize transition-colors"
                    >
                      {id === "visa" ? "Visa & Insurance" : id}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-14">
              <VisaSection result={visaResult} />
              <AccommodationSection result={accommodationResult} />
              <TransportSection result={transportResult} />
              <ActivitiesSection result={activitiesResult} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
