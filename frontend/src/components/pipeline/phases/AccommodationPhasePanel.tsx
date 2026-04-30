"use client";

import { useEffect, useState } from "react";
import { fetchPhaseResult, postPhaseChat, postPhaseConfirm } from "@/lib/api/trip";
import { usePipelineStore } from "@/store/pipelineStore";
import { AccommodationSection } from "@/components/results/accommodation/AccommodationSection";
import { ChatSidebar } from "../ChatSidebar";
import type { AccommodationAgentResult } from "@/types/accommodation";
import type { ChatMessage } from "@/types/pipeline";

interface Props {
  sessionId: string;
  onConfirmed: () => void;
  resumePolling: () => void;
}

export function AccommodationPhasePanel({ sessionId, onConfirmed, resumePolling }: Props) {
  const { phases, chatHistories, setAccommodationResult, appendChatMessage } = usePipelineStore();
  const phaseState = phases["accommodation"];
  const [result, setResult] = useState<AccommodationAgentResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const isRunning = phaseState?.status === "running" || phaseState?.status === "pending";
  const isReady = phaseState?.status === "completed" && result !== null;

  useEffect(() => {
    if (phaseState?.hasResult && !result) {
      fetchPhaseResult(sessionId, "accommodation")
        .then((data) => {
          setResult(data);
          setAccommodationResult(data);
        })
        .catch(() => {});
    }
  }, [phaseState?.hasResult, sessionId, result, setAccommodationResult]);

  // Re-fetch result after regeneration
  useEffect(() => {
    if (phaseState?.status === "completed" && phaseState?.hasResult) {
      fetchPhaseResult(sessionId, "accommodation")
        .then((data) => {
          setResult(data);
          setAccommodationResult(data);
        })
        .catch(() => {});
    }
  }, [phaseState?.status, phaseState?.completedAt, sessionId, setAccommodationResult]);

  const handleSend = async (msg: string) => {
    const now = new Date().toISOString();
    appendChatMessage("accommodation", { role: "user", content: msg, timestamp: now });
    await postPhaseChat(sessionId, "accommodation", msg);
    resumePolling();
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await postPhaseConfirm(sessionId, "accommodation");
      resumePolling();
      onConfirmed();
    } finally {
      setIsConfirming(false);
    }
  };

  const chatMessages: ChatMessage[] = chatHistories["accommodation"] || [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-h-96">
        {result ? (
          <AccommodationSection result={result} />
        ) : (
          <div className="h-64 flex items-center justify-center text-brand-night/40 text-sm">
            {isRunning ? "Agent is searching for accommodation..." : "Waiting..."}
          </div>
        )}
      </div>
      <div className="h-[600px]">
        <ChatSidebar
          phase="accommodation"
          phaseLabel="Accommodation"
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
