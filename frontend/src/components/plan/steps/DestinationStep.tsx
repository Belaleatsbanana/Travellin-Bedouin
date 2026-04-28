"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TripFormData } from "@/types/trip";
import { ArrowRight } from "lucide-react";

const schema = z.object({
  originCountry: z.string().min(2, "Required"),
  destinationCountry: z.string().min(2, "Required"),
  destinationCity: z.string().min(2, "City must be at least 2 characters"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues: Partial<TripFormData>;
  onNext: (data: Partial<TripFormData>) => void;
}

export function DestinationStep({ defaultValues, onNext }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      originCountry: defaultValues.originCountry || "",
      destinationCountry: defaultValues.destinationCountry || "",
      destinationCity: defaultValues.destinationCity || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold text-brand-night mb-1">Where are you going?</h2>
        <p className="text-sm text-brand-night/50 mb-6">Tell us your origin and destination.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-night mb-1.5">Departing from</label>
          <input
            {...register("originCountry")}
            placeholder="e.g. Egypt, United Arab Emirates"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
          />
          {errors.originCountry && <p className="text-xs text-red-500 mt-1">{errors.originCountry.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-night mb-1.5">Destination country</label>
          <input
            {...register("destinationCountry")}
            placeholder="e.g. Japan, France, Morocco"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
          />
          {errors.destinationCountry && <p className="text-xs text-red-500 mt-1">{errors.destinationCountry.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-night mb-1.5">Destination city</label>
          <input
            {...register("destinationCity")}
            placeholder="e.g. Tokyo, Paris, Marrakech"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
          />
          {errors.destinationCity && <p className="text-xs text-red-500 mt-1">{errors.destinationCity.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-night text-white font-semibold hover:bg-brand-night/90 transition-colors"
      >
        Next <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
