"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TripFormData } from "@/types/trip";
import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";

const schema = z.object({
  adults: z.number().min(1, "At least 1 adult required").max(10),
  children: z.number().min(0).max(10),
  seniors: z.number().min(0).max(10),
  passportNationality: z.string().min(2, "Required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultValues: Partial<TripFormData>;
  onNext: (data: Partial<TripFormData>) => void;
  onBack: () => void;
}

function Counter({
  label,
  sublabel,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-brand-night">{label}</p>
        <p className="text-xs text-brand-night/50">{sublabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-sand transition-colors disabled:opacity-30"
          disabled={value <= min}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-6 text-center font-semibold text-brand-night">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-sand transition-colors disabled:opacity-30"
          disabled={value >= max}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function TravelersStep({ defaultValues, onNext, onBack }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      adults: defaultValues.travelers?.adults ?? 1,
      children: defaultValues.travelers?.children ?? 0,
      seniors: defaultValues.travelers?.seniors ?? 0,
      passportNationality: defaultValues.passportNationality || "",
    },
  });

  const adults = watch("adults");
  const children = watch("children");
  const seniors = watch("seniors");

  function onSubmit(data: FormValues) {
    onNext({
      travelers: { adults: data.adults, children: data.children, seniors: data.seniors },
      passportNationality: data.passportNationality,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-semibold text-brand-night mb-1">Who is travelling?</h2>
        <p className="text-sm text-brand-night/50 mb-6">Tell us about your group.</p>
      </div>

      <div className="bg-gray-50 rounded-xl px-5">
        <Counter label="Adults" sublabel="Age 18–64" value={adults} onChange={(v) => setValue("adults", v)} min={1} />
        <Counter label="Children" sublabel="Age 2–17" value={children} onChange={(v) => setValue("children", v)} />
        <Counter label="Seniors" sublabel="Age 65+" value={seniors} onChange={(v) => setValue("seniors", v)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-night mb-1.5">Passport nationality</label>
        <input
          {...register("passportNationality")}
          placeholder="e.g. Egyptian, American, British"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-brand-night focus:outline-none focus:ring-2 focus:ring-brand-sand"
        />
        {errors.passportNationality && <p className="text-xs text-red-500 mt-1">{errors.passportNationality.message}</p>}
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
