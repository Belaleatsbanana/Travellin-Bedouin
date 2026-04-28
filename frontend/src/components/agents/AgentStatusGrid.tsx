"use client";

import { useAgentStore } from "@/store/agentStore";
import { AgentCard } from "./AgentCard";
import type { AgentId } from "@/types/agents";

const AGENT_ORDER: AgentId[] = ["budget", "visa_insurance", "accommodation", "transportation", "activities"];

export function AgentStatusGrid() {
  const { agents, budgetAllocation } = useAgentStore();

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {AGENT_ORDER.map((agentId) => {
        const state = agents[agentId];
        return (
          <AgentCard
            key={agentId}
            agentId={agentId}
            status={state.status}
            progress={state.progress}
            thoughts={state.thoughts}
            budgetAllocated={
              budgetAllocation
                ? budgetAllocation.breakdown[agentId as keyof typeof budgetAllocation.breakdown]
                : undefined
            }
            currency={budgetAllocation?.currency}
            completedAt={state.completedAt}
          />
        );
      })}
    </div>
  );
}
