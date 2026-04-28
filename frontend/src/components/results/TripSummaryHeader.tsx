import type { TripFormData } from "@/types/trip";
import { MapPin, Calendar, Users, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Props {
  formData: TripFormData;
  totalBudget: number;
  currency: string;
}

export function TripSummaryHeader({ formData, totalBudget, currency }: Props) {
  const total = formData.travelers.adults + formData.travelers.children + formData.travelers.seniors;
  return (
    <div className="bg-brand-night rounded-2xl p-6 text-white">
      <p className="text-brand-sand/60 text-xs uppercase tracking-widest font-medium mb-1">Your AI-Generated Trip Plan</p>
      <h1 className="font-serif text-3xl font-bold mb-4">
        {formData.destinationCity}, {formData.destinationCountry}
      </h1>
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 text-white/70">
          <MapPin className="w-4 h-4 text-brand-sand" />
          <span>From {formData.originCountry}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Calendar className="w-4 h-4 text-brand-sand" />
          <span>{formatDate(formData.departureDate)} — {formatDate(formData.returnDate)} ({formData.durationNights} nights)</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <Users className="w-4 h-4 text-brand-sand" />
          <span>{total} traveler{total > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <DollarSign className="w-4 h-4 text-brand-sand" />
          <span className="font-bold text-brand-sand">{formatCurrency(totalBudget, currency)} total budget</span>
        </div>
      </div>
    </div>
  );
}
