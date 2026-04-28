"use client";

import type { AgentId, AgentStatus, AgentThought } from "@/types/agents";
import { AGENT_LABELS, AGENT_DESCRIPTIONS } from "@/types/agents";
import { AgentThinkingFeed } from "./AgentThinkingFeed";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DollarSign, Shield, Building2, Car, Sparkles,
  Lock, CheckCircle2, XCircle, CircleDot,
} from "lucide-react";

const AGENT_ICONS: Record<AgentId, React.ElementType> = {
  budget: DollarSign,
  visa_insurance: Shield,
  accommodation: Building2,
  transportation: Car,
  activities: Sparkles,
};

interface Props {
  agentId: AgentId;
  status: AgentStatus;
  progress: number;
  thoughts: AgentThought[];
  budgetAllocated?: number;
  currency?: string;
  completedAt?: string;
}

export function AgentCard({ agentId, status, progress, thoughts, budgetAllocated, currency, completedAt }: Props) {
  const Icon = AGENT_ICONS[agentId];
  const label = AGENT_LABELS[agentId];
  const desc = AGENT_DESCRIPTIONS[agentId];

  return (
    <div
      className={cn(
        "rounded-2xl border-2 p-5 bg-white transition-all duration-500",
        status === "pending" && "border-gray-200 opacity-60",
        status === "running" && "border-blue-400 agent-card-running",
        status === "completed" && "border-emerald-400 agent-card-completed",
        status === "failed" && "border-red-400 animate-shake"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            status === "pending" && "bg-gray-100",
            status === "running" && "bg-blue-50",
            status === "completed" && "bg-emerald-50",
            status === "failed" && "bg-red-50",
          )}>
            <Icon className={cn(
              "w-5 h-5",
              status === "pending" && "text-gray-400",
              status === "running" && "text-blue-500",
              status === "completed" && "text-emerald-500",
              status === "failed" && "text-red-500",
            )} />
          </div>
          <div>
            <p className="font-semibold text-brand-night text-sm">{label}</p>
            {budgetAllocated && currency ? (
              <p className="text-xs text-brand-sand font-medium">{formatCurrency(budgetAllocated, currency)} allocated</p>
            ) : (
              <p className="text-xs text-gray-400">{desc}</p>
            )}
          </div>
        </div>

        <StatusIcon status={status} />
      </div>

      {status === "pending" && (
        <p className="text-xs text-gray-400 italic">Waiting for budget allocation...</p>
      )}

      {status === "running" && (
        <>
          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <AgentThinkingFeed thoughts={thoughts} />
        </>
      )}

      {status === "completed" && (
        <div className="text-xs text-emerald-600 font-medium">
          ✓ Analysis complete
          {completedAt && (
            <span className="text-gray-400 font-normal ml-2">
              at {new Date(completedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {status === "failed" && (
        <p className="text-xs text-red-500">Agent encountered an error. Retry the session.</p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "pending") return <Lock className="w-4 h-4 text-gray-300" />;
  if (status === "running") return <CircleDot className="w-4 h-4 text-blue-400 animate-pulse" />;
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}
