"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/pipeline";
import { AgentThinkingFeed } from "./AgentThinkingFeed";

interface Props {
  phase: string;
  phaseLabel: string;
  isAgentRunning: boolean;
  isReady: boolean;
  thoughts: Array<{ timestamp: string; message: string; type: string }>;
  progress: number;
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export function ChatSidebar({
  phase,
  phaseLabel,
  isAgentRunning,
  isReady,
  thoughts,
  progress,
  chatMessages,
  onSendMessage,
  onConfirm,
  isConfirming,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isAgentRunning) return;
    setInput("");
    onSendMessage(msg);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-brand-sand/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-semibold text-brand-night text-sm">{phaseLabel} Assistant</p>
        <p className="text-xs text-brand-night/40">Tell me what you want changed</p>
      </div>

      {/* Agent thinking feed (shown while running) */}
      {(isAgentRunning || (!isReady && thoughts.length > 0)) && (
        <div className="px-4 py-3 bg-amber-50/50 border-b border-amber-100">
          <AgentThinkingFeed thoughts={thoughts} isRunning={isAgentRunning} progress={progress} />
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {chatMessages.length === 0 && isReady && (
          <p className="text-xs text-brand-night/40 text-center pt-4">
            Results are ready. Ask me to change anything, or confirm when satisfied.
          </p>
        )}
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-auto bg-brand-sand text-brand-night"
                : "bg-gray-100 text-brand-night/80"
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Make it cheaper, add a pool, only 5-star..."
            disabled={isAgentRunning || !isReady}
            rows={2}
            className="flex-1 resize-none text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:border-brand-sand disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAgentRunning || !isReady}
            className="self-end p-2.5 rounded-xl bg-brand-night text-white disabled:opacity-40 hover:bg-brand-night/80 transition-colors"
          >
            {isAgentRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={onConfirm}
          disabled={!isReady || isAgentRunning || isConfirming}
          className="w-full py-2.5 rounded-xl bg-brand-sand text-brand-night font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-brand-dune transition-colors"
        >
          {isConfirming ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Looks good, continue</>
          )}
        </button>
      </div>
    </div>
  );
}
