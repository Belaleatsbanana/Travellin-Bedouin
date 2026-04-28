import { Navbar } from "@/components/layout/Navbar";
import { TripPlannerForm } from "@/components/plan/TripPlannerForm";

export default function PlanPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-brand-parchment flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-serif font-bold text-brand-night mb-2">
              Plan Your Trip
            </h1>
            <p className="text-brand-night/60">
              Five quick steps — our agents take it from there.
            </p>
          </div>
          <TripPlannerForm />
        </div>
      </main>
    </>
  );
}
