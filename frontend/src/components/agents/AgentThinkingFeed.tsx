"use client";

import { useEffect, useRef } from "react";
import type { AgentThought } from "@/types/agents";
import { cn } from "@/lib/utils";
import { Info, Search, CheckCircle, AlertTriangle } from "lucide-react";

const typeConfig = {
  info: { Icon: Info, color: "text-blue-400", border: "border-l-blue-400" },
  search: { Icon: Search, color: "text-yellow-400", border: "border-l-yellow-400" },
  decision: { Icon: CheckCircle, color: "text-emerald-400", border: "border-l-emerald-400" },
  warning: { Icon: AlertTriangle, color: "text-orange-400", border: "border-l-orange-400" },
};

interface Props {
  thoughts: AgentThought[];
  maxVisible?: number;
}

export function AgentThinkingFeed({ thoughts, maxVisible = 5 }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thoughts.length]);

  const visible = thoughts.slice(-maxVisible);

  if (visible.length === 0) {
    return <p className="text-xs text-gray-400 italic py-2">Starting up...</p>;
  }

  return (
    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
      {visible.map((t, i) => {
        const { Icon, color, border } = typeConfig[t.type];
        return (
          <div
            key={i}
            className={cn("flex items-start gap-2 text-xs border-l-2 pl-2 py-0.5", border)}
          >
            <Icon className={cn("w-3 h-3 mt-0.5 shrink-0", color)} />
            <span className="text-gray-600 leading-tight">{t.message}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
