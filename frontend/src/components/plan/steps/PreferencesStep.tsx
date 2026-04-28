"use client";

import { useState } from "react";
import type { TripFormData, AccommodationPreference, TransportPreference, ActivityCategory } from "@/types/trip";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACC_OPTIONS: { value: AccommodationPreference; label: string; emoji: string }[] = [
  { value: "hotel", label: "Hotel", emoji: "🏨" },
  { value: "apartment", label: "Apartment", emoji: "🏠" },
  { value: "chalet", label: "Chalet", emoji: "🏡" },
  { value: "villa", label: "Villa", emoji: "🏰" },
  { value: "any", label: "No preference", emoji: "✨" },
];

const TRANSPORT_OPTIONS: { value: TransportPreference; label: string; emoji: string }[] = [
  { value: "rental_car", label: "Rental Car", emoji: "🚗" },
  { value: "dedicated_driver", label: "Private Driver", emoji: "🧑‍✈️" },
  { value: "public_transport", label: "Public Transport", emoji: "🚇" },
  { value: "mixed", label: "Mixed (Recommended)", emoji: "🔀" },
];

const ACTIVITY_OPTIONS: { value: ActivityCategory; label: string; emoji: string }[] = [
  { value: "culture", label: "Culture & History", emoji: "🏛️" },
  { value: "food", label: "Food & Dining", emoji: "🍜" },
  { value: "nature", label: "Nature & Outdoors", emoji: "🌿" },
  { value: "adventure", label: "Adventure", emoji: "🧗" },
  { value: "family", label: "Family-friendly", emoji: "👨‍👩‍👧" },
  { value: "nightlife", label: "Nightlife", emoji: "🌙" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
];

interface Props {
  defaultValues: Partial<TripFormData>;
  onSubmit: (data: Partial<TripFormData>) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function PreferencesStep({ defaultValues, onSubmit, onBack, isLoading }: Props) {
  const [accPref, setAccPref] = useState<AccommodationPreference>(defaultValues.accommodationPreference || "any");
  const [transportPref, setTransportPref] = useState<TransportPreference>(defaultValues.transportPreference || "mixed");
  const [activities, setActivities] = useState<ActivityCategory[]>(defaultValues.activityCategories || ["culture", "food"]);

  function toggleActivity(cat: ActivityCategory) {
    setActivities((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activities.length === 0) return;
    onSubmit({
      accommodationPreference: accPref,
      transportPreference: transportPref,
      activityCategories: activities,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div>
        <h2 className="text-xl font-serif font-semibold text-brand-night mb-1">Your preferences</h2>
        <p className="text-sm text-brand-night/50 mb-6">Help the agents tailor recommendations for you.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-brand-night mb-3">Accommodation type</p>
        <div className="grid grid-cols-5 gap-2">
          {ACC_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccPref(value)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all",
                accPref === value
                  ? "border-brand-sand bg-brand-sand/10 text-brand-dune"
                  : "border-gray-200 text-brand-night/60 hover:border-brand-sand/40"
              )}
            >
              <span className="text-xl">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-brand-night mb-3">Transport preference</p>
        <div className="grid grid-cols-2 gap-2">
          {TRANSPORT_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTransportPref(value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
                transportPref === value
                  ? "border-brand-sand bg-brand-sand/10 text-brand-dune"
                  : "border-gray-200 text-brand-night/60 hover:border-brand-sand/40"
              )}
            >
              <span className="text-lg">{emoji}</span> {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-brand-night mb-1">Activity interests</p>
        <p className="text-xs text-brand-night/40 mb-3">Select at least one</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleActivity(value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition-all",
                activities.includes(value)
                  ? "border-brand-sand bg-brand-sand text-brand-night font-semibold"
                  : "border-gray-200 text-brand-night/60 hover:border-brand-sand/40"
              )}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
        {activities.length === 0 && (
          <p className="text-xs text-red-500 mt-2">Select at least one activity category</p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-brand-night/70 hover:border-brand-sand transition-colors" disabled={isLoading}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="submit"
          disabled={isLoading || activities.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-sand text-brand-night font-bold hover:bg-brand-dune transition-colors disabled:opacity-60"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Launching agents...</>
          ) : (
            "Start Planning →"
          )}
        </button>
      </div>
    </form>
  );
}
