"use client";

import { useEffect, useState } from "react";
import { fetchPhaseResult, postPhaseChat, postPhaseConfirm } from "@/lib/api/trip";
import { usePipelineStore } from "@/store/pipelineStore";
import { TransportSection } from "@/components/results/transport/TransportSection";
import { ChatSidebar } from "../ChatSidebar";
import type { TransportAgentResult } from "@/types/transport";
import type { ChatMessage } from "@/types/pipeline";

interface Props {
  sessionId: string;
  onConfirmed: () => void;
  resumePolling: () => void;
}

export function TransportPhasePanel({ sessionId, onConfirmed, resumePolling }: Props) {
  const { phases, chatHistories, setTransportResult, appendChatMessage } = usePipelineStore();
  const phaseState = phases["transportation"];
  const [result, setResult] = useState<TransportAgentResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const isRunning = phaseState?.status === "running" || phaseState?.status === "pending";
  const isReady = phaseState?.status === "completed" && result !== null;

  const loadResult = () => {
    if (phaseState?.hasResult) {
      fetchPhaseResult(sessionId, "transportation")
        .then((data) => {
          setResult(data);
          setTransportResult(data);
        })
        .catch(() => {});
    }
  };

  useEffect(() => { loadResult(); }, [phaseState?.hasResult]);
  useEffect(() => { if (phaseState?.status === "completed") loadResult(); }, [phaseState?.completedAt]);

  const handleSend = async (msg: string) => {
    const now = new Date().toISOString();
    appendChatMessage("transportation", { role: "user", content: msg, timestamp: now });
    await postPhaseChat(sessionId, "transportation", msg);
    resumePolling();
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await postPhaseConfirm(sessionId, "transportation");
      resumePolling();
      onConfirmed();
    } finally {
      setIsConfirming(false);
    }
  };

  const chatMessages: ChatMessage[] = chatHistories["transportation"] || [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 min-h-96">
        {result ? (
          <TransportSection result={result} />
        ) : (
          <div className="h-64 flex items-center justify-center text-brand-night/40 text-sm">
            {isRunning ? "Agent is planning transport between your activities..." : "Waiting for activities confirmation..."}
          </div>
        )}
      </div>
      <div className="h-[600px]">
        <ChatSidebar
          phase="transportation"
          phaseLabel="Transportation"
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
