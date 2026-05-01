export type PipelinePhase = "accommodation" | "activities" | "transportation";
export type PipelineStatus = "initializing" | "running" | "awaiting_confirmation" | "done" | "failed";
export type PhaseStatus = "pending" | "running" | "completed" | "confirmed" | "failed";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface PhaseState {
  phaseId: PipelinePhase;
  status: PhaseStatus;
  progress: number;
  thoughts: Array<{ timestamp: string; message: string; type: string }>;
  hasResult: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PipelineStatusResponse {
  sessionId: string;
  overallStatus: PipelineStatus;
  currentPhase: string;
  phases: Record<PipelinePhase, PhaseState>;
}
