"use client";

import { useEffect, useState } from "react";
import { fetchPhaseResult, postPhaseChat, postPhaseConfirm } from "@/lib/api/trip";
import { usePipelineStore } from "@/store/pipelineStore";
import { useTripStore } from "@/store/tripStore";
import { ActivitiesSection } from "@/components/results/activities/ActivitiesSection";
import { ChatSidebar } from "../ChatSidebar";
import type { ActivitiesAgentResult } from "@/types/activities";
import type { ChatMessage } from "@/types/pipeline";

interface Props {
  sessionId: string;
  onConfirmed: () => void;
  resumePolling: () => void;
}

export function ActivitiesPhasePanel({ sessionId, onConfirmed, resumePolling }: Props) {
  const { phases, chatHistories, setActivitiesResult, appendChatMessage } = usePipelineStore();
  const durationNights = useTripStore((s) => s.formData.durationNights) ?? 7;
  const phaseState = phases["activities"];
  const [result, setResult] = useState<ActivitiesAgentResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const isRunning = phaseState?.status === "running" || phaseState?.status === "pending";
  const isReady = phaseState?.status === "completed" && result !== null;

  const loadResult = () => {
    if (phaseState?.hasResult) {
      fetchPhaseResult(sessionId, "activities")
        .then((data) => {
          setResult(data);
          setActivitiesResult(data);
        })
        .catch(() => {});
    }
  };

  useEffect(() => { loadResult(); }, [phaseState?.hasResult]);
  useEffect(() => { if (phaseState?.status === "completed") loadResult(); }, [phaseState?.completedAt]);

  const handleSend = async (msg: string) => {
    const now = new Date().toISOString();
    appendChatMessage("activities", { role: "user", content: msg, timestamp: now });
    await postPhaseChat(sessionId, "activities", msg);
    resumePolling();
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await postPhaseConfirm(sessionId, "activities");
      resumePolling();
      onConfirmed();
    } finally {
      setIsConfirming(false);
    }
  };

  const chatMessages: ChatMessage[] = chatHistories["activities"] || [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-h-96">
        {result ? (
          <ActivitiesSection result={result} durationNights={durationNights} />
        ) : (
          <div className="h-64 flex items-center justify-center text-brand-night/40 text-sm">
            {isRunning ? "Agent is planning activities near your hotel..." : "Waiting for accommodation confirmation..."}
          </div>
        )}
      </div>
      <div className="h-[600px]">
        <ChatSidebar
          phase="activities"
          phaseLabel="Activities"
          isAgentRunning={isRunning}
          isReady={isReady}
          thoughts={phaseState?.thoughts || []}
          progress={phaseState?.progress || 0}
          chatMessages={chatMessages}
          onSendMessage={handleSend}
          onConfirm={handleConfirm}
          isConfirming={isConfirming}
        />
      </div>
    </div>
  );
}
