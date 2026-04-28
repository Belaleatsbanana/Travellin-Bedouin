"use client";

import type { ActivitiesAgentResult, Activity } from "@/types/activities";
import { DURATION_LABELS } from "@/types/activities";
import { useSelectionStore } from "@/store/selectionStore";
import { SectionHeader } from "../shared/SectionHeader";
import { Sparkles, Clock, MapPin, Star, Check, Calendar } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

function ActivityCard({ activity, isSelected, onToggle, dayLabel }: {
  activity: Activity;
  isSelected: boolean;
  onToggle: (id: string) => void;
  dayLabel?: string;
}) {
  return (
    <div
      onClick={() => onToggle(activity.id)}
      className={cn(
        "rounded-2xl border-2 bg-white overflow-hidden cursor-pointer transition-all hover:shadow-sm",
        isSelected ? "border-brand-sand shadow-sm shadow-brand-sand/10" : "border-gray-100"
      )}
    >
      <div className="h-32 bg-gradient-to-br from-emerald-100 to-teal-50 relative overflow-hidden">
        {activity.images[0] && (
          <img src={activity.images[0]} alt={activity.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {dayLabel && (
            <span className="px-2 py-0.5 rounded-full bg-white/90 text-brand-night text-[10px] font-bold flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {dayLabel}
            </span>
          )}
          {activity.recommended && (
            <span className="px-2 py-0.5 rounded-full bg-brand-sand text-brand-night text-[10px] font-bold flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" /> Recommended
            </span>
          )}
        </div>
        {isSelected && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-brand-sand flex items-center justify-center">
            <Check className="w-4 h-4 text-brand-night" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-brand-night text-sm mb-1 leading-snug">{activity.name}</h4>
        <p className="text-xs text-brand-night/50 mb-2 line-clamp-2">{activity.description}</p>
        <div className="flex items-center gap-3 text-xs text-brand-night/50 mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{DURATION_LABELS[activity.duration]}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activity.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-brand-sand text-brand-sand" />
            <span className="font-semibold text-brand-night">{activity.rating}</span>
            <span className="text-brand-night/30">({activity.reviewCount.toLocaleString()})</span>
          </div>
          <span className="font-bold text-brand-dune">
            {activity.price === 0
              ? "Free"
              : `${formatCurrency(activity.price, activity.currency)}/${activity.priceType === "per_person" ? "pp" : "group"}`}
          </span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  result: ActivitiesAgentResult;
}

export function ActivitiesSection({ result }: Props) {
  const { selectedActivityIds, toggleActivity } = useSelectionStore();

  const dayOfActivity = (actId: string) => {
    const day = result.suggestedItinerary.find((d) => d.activities.includes(actId));
    return day ? `Day ${day.day}` : undefined;
  };

  const totalSelected = result.activities
    .filter((a) => selectedActivityIds.includes(a.id))
    .reduce((s, a) => s + a.price, 0);

  return (
    <section id="activities" className="space-y-6">
      <SectionHeader
        Icon={Sparkles}
        title="Activities & Itinerary"
        subtitle={result.recommendation}
        badge={`${result.activities.length} experiences`}
      />

      {selectedActivityIds.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
          <span className="text-emerald-700 font-medium">{selectedActivityIds.length} activities selected</span>
          <span className="font-bold text-emerald-800">{formatCurrency(totalSelected, result.currency)} total</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {result.activities.map((act) => (
          <ActivityCard
            key={act.id}
            activity={act}
            isSelected={selectedActivityIds.includes(act.id)}
            onToggle={toggleActivity}
            dayLabel={dayOfActivity(act.id)}
          />
        ))}
      </div>

      <div>
        <h3 className="font-serif font-semibold text-brand-night mb-4">Suggested Itinerary</h3>
        <div className="space-y-3">
          {result.suggestedItinerary.map(({ day, date, activities: actIds, freeTime }) => (
            <div key={day} className="bg-white rounded-xl border border-brand-sand/20 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-brand-night text-brand-sand font-serif font-bold text-sm flex items-center justify-center shrink-0">
                  {day}
                </div>
                <div>
                  <p className="font-semibold text-brand-night text-sm">Day {day}</p>
                  <p className="text-xs text-brand-night/40">{formatDate(date)}</p>
                </div>
              </div>
              {actIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {actIds.map((id) => {
                    const act = result.activities.find((a) => a.id === id);
                    return act ? (
                      <span key={id} className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                        {act.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <p className="text-xs text-brand-night/50 italic">{freeTime}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
