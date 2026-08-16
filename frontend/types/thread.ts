export type MessageRole = "user" | "assistant";

export type FeedbackRating = "up" | "down";
export type FeedbackValue = FeedbackRating | null;

// Shapes returned directly by the backend.
export interface ThreadResponse {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RagSource {
  name: string;
  source?: string | null;
  file_id?: string | null;
  page?: string | number | null;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IntermediateSteps {
  rewritten_query: string | null;
  rejected: boolean;
  rejection_reason: string | null;
  sources: RagSource[];
}

export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  created_at: string;
  intermediate_steps?: IntermediateSteps | null;
}

export interface ThreadWithMessagesResponse extends ThreadResponse {
  messages: MessageResponse[];
  next_cursor?: string | null;
}

// UI-facing shapes.
export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  createdAt?: string;
  intermediateSteps?: IntermediateSteps | null;
}

export interface Thread {
  id: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface ThreadWithMessages extends Thread {
  messages: Message[];
}

export function toThread(res: ThreadResponse): Thread {
  return {
    id: res.id,
    title: res.name ?? "",
    createdAt: res.created_at,
    updatedAt: res.updated_at,
  };
}

export function toMessage(res: MessageResponse, threadId: string): Message {
  return {
    id: res.id,
    threadId,
    role: res.role === "assistant" ? "assistant" : "user",
    content: res.content,
    createdAt: res.created_at,
    intermediateSteps: res.intermediate_steps ?? null,
  };
}

export interface SendMessagePayload {
  content: string;
}
