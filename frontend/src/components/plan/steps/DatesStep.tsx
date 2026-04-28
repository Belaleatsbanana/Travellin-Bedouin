"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TripFormData } from "@/types/trip";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const today = new Date().toISOString().split("T")[0];

const schema = z.object({
  departureDate: z.string().min(1, "Required").refine((d) => d >= today, "Must be a future date"),
  returnDate: z.string().min(1, "Required"),
}).refine((d) => d.returnDate > d.departureDate, {
  message: "Return must be after departure",
  path: ["returnDate"],
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues: Partial<TripFormData>;
  onNext: (data: Partial<TripFormData>) => void;
  onBack: () => void;
}

export function DatesStep({ defaultValues, onNext, onBack }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      departureDate: defaultValues.departureDate || "",
      returnDate: defaultValues.returnDate || "",
    },
  });

  const dep = watch("departureDate");
  const ret = watch("returnDate");
  const nights = dep && ret && ret > dep ? differenceInDays(parseISO(ret), parseISO(dep)) : null;

  function onSubmit(data: FormValues) {
    onNext({
      ...data,
      durationNights: nights ?? 0,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold text-brand-night mb-1">When are you travelling?</h2>
        <p className="text-sm text-brand-night/50 mb-6">Select your departure and return dates.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-brand-night mb-1.5">Departure date</label>
          <input
            type="date"
            {...register("departureDate")}
            min={today}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
          />
          {errors.departureDate && <p className="text-xs text-red-500 mt-1">{errors.departureDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-night mb-1.5">Return date</label>
          <input
            type="date"
            {...register("returnDate")}
            min={dep || today}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
          />
          {errors.returnDate && <p className="text-xs text-red-500 mt-1">{errors.returnDate.message}</p>}
        </div>
      </div>

      {nights !== null && (
        <div className="bg-brand-sand/10 border border-brand-sand/30 rounded-xl px-4 py-3 text-center">
          <span className="font-serif font-semibold text-brand-dune text-lg">{nights} nights</span>
          <span className="text-brand-night/50 text-sm"> · {nights + 1} days</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-brand-night/70 hover:border-brand-sand transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-night text-white font-semibold hover:bg-brand-night/90 transition-colors"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
