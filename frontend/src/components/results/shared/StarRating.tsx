import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < Math.round(rating) ? "fill-brand-sand text-brand-sand" : "text-gray-200 fill-gray-200"
          )}
        />
      ))}
    </div>
  );
}
