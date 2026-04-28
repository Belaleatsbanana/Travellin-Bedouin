import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  Icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export function SectionHeader({ Icon, title, subtitle, badge, className }: Props) {
  return (
    <div className={cn("flex items-center gap-3 mb-6", className)}>
      <div className="w-10 h-10 rounded-xl bg-brand-night flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-brand-sand" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-serif font-bold text-brand-night">{title}</h2>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-brand-sand/20 text-brand-dune text-xs font-semibold">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-brand-night/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
