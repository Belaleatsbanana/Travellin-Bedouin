"use client";

import { Loader2, Search, Lightbulb, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  search: Search,
  decision: Lightbulb,
  info: Info,
  warning: AlertTriangle,
};

const COLORS: Record<string, string> = {
  search: "text-blue-500",
  decision: "text-amber-500",
  info: "text-brand-night/60",
  warning: "text-red-400",
};

interface Thought {
  timestamp: string;
  message: string;
  type: string;
}

interface Props {
  thoughts: Thought[];
  isRunning: boolean;
  progress: number;
}

export function AgentThinkingFeed({ thoughts, isRunning, progress }: Props) {
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-brand-sand rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Thoughts feed */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {thoughts.slice(-12).map((t, i) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", COLORS[t.type] || "text-gray-400")} />
              <span className="text-brand-night/70 leading-relaxed">{t.message}</span>
            </div>
          );
        })}
        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-brand-night/40">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Working...</span>
          </div>
        )}
      </div>
    </div>
  );
}
