"use client";

import { useState } from "react";
import { useTripStore } from "@/store/tripStore";
import { useTripSession } from "@/hooks/useTripSession";
import { FormStepper } from "./FormStepper";
import { DestinationStep } from "./steps/DestinationStep";
import { DatesStep } from "./steps/DatesStep";
import { TravelersStep } from "./steps/TravelersStep";
import { BudgetStep } from "./steps/BudgetStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import type { TripFormData } from "@/types/trip";

const STEPS = [
  { label: "Destination" },
  { label: "Dates" },
  { label: "Travelers" },
  { label: "Budget" },
  { label: "Preferences" },
];

export function TripPlannerForm() {
  const [step, setStep] = useState(0);
  const { formData, setStepData } = useTripStore();
  const { submitTrip, isLoading } = useTripSession();

  function handleNext(data: Partial<TripFormData>) {
    setStepData(data);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function handleSubmit(data: Partial<TripFormData>) {
    const full = { ...formData, ...data } as TripFormData;
    setStepData(data);
    submitTrip(full);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-sand/20 p-8">
      <FormStepper currentStep={step} steps={STEPS} />

      {step === 0 && (
        <DestinationStep defaultValues={formData} onNext={handleNext} />
      )}
      {step === 1 && (
        <DatesStep defaultValues={formData} onNext={handleNext} onBack={handleBack} />
      )}
      {step === 2 && (
        <TravelersStep defaultValues={formData} onNext={handleNext} onBack={handleBack} />
      )}
      {step === 3 && (
        <BudgetStep defaultValues={formData} onNext={handleNext} onBack={handleBack} />
      )}
      {step === 4 && (
        <PreferencesStep
          defaultValues={formData}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
