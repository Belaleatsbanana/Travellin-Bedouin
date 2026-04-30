"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchFullResults } from "@/lib/api/trip";
import { useTripStore } from "@/store/tripStore";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { TripSummaryHeader } from "@/components/results/TripSummaryHeader";
import { BudgetBreakdownChart } from "@/components/results/BudgetBreakdownChart";
import { VisaSection } from "@/components/results/visa/VisaSection";
import { AccommodationSection } from "@/components/results/accommodation/AccommodationSection";
import { TransportSection } from "@/components/results/transport/TransportSection";
import { ActivitiesSection } from "@/components/results/activities/ActivitiesSection";
import { Loader2 } from "lucide-react";

const MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { formData } = useTripStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["full-results", sessionId],
    queryFn: () => fetchFullResults(sessionId),
    enabled: !MOCK && !!sessionId,
    staleTime: Infinity,
    retry: false,
  });

  const isNotFound = (error as (Error & { status?: number }) | null)?.status === 404;

  useEffect(() => {
    if (isError && isNotFound) {
      router.push("/plan");
    }
  }, [isError, isNotFound, router]);

  if (isLoading || (!data && !isError)) {
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
  const visa = data?.visa;
  const accommodation = data?.accommodation;
  const transport = data?.transport;
  const activities = data?.activities;
  const tripFormData = (data?.formData ?? formData) as any;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-brand-parchment">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          {budget && (
            <TripSummaryHeader
              formData={tripFormData}
              totalBudget={budget.totalBudget}
              currency={budget.currency}
            />
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {budget && <BudgetBreakdownChart allocation={budget} />}
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
              {visa && <VisaSection result={visa} />}
              {accommodation && <AccommodationSection result={accommodation} />}
              {transport && <TransportSection result={transport} />}
              {activities && <ActivitiesSection result={activities} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
