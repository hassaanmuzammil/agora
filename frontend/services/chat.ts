import { api, streamPost } from "./api";
import {
  toMessage,
  toThread,
} from "@/types/thread";
import type {
  FeedbackRating,
  IntermediateSteps,
  Message,
  MessageResponse,
  SendMessagePayload,
  Thread,
  ThreadResponse,
  ThreadWithMessages,
  ThreadWithMessagesResponse,
} from "@/types/thread";

export interface StreamCallbacks {
  onUserMessage?: (message: Message) => void;
  onIntermediateSteps?: (steps: IntermediateSteps) => void;
  onDelta?: (content: string) => void;
  onDone?: (message: Message | null) => void;
  onError?: (message: string) => void;
}

function parseSSEEvent(raw: string): { event: string; data: unknown } | null {
  let event = "message";
  let dataLine = "";

  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }

  if (!dataLine) return null;
  return { event, data: JSON.parse(dataLine) };
}

export const chatService = {
  listThreads: async (): Promise<Thread[]> => {
    const res = await api.get<ThreadResponse[]>("/threads");
    return res.map(toThread);
  },

  createThread: async (name?: string): Promise<Thread> => {
    const res = await api.post<ThreadResponse>("/threads", { name: name ?? null });
    return toThread(res);
  },

  getThread: async (threadId: string): Promise<ThreadWithMessages> => {
    const res = await api.get<ThreadWithMessagesResponse>(`/threads/${threadId}`);
    return {
      ...toThread(res),
      messages: res.messages.map((m) => toMessage(m, threadId)),
    };
  },

  renameThread: async (threadId: string, title: string): Promise<Thread> => {
    const res = await api.patch<ThreadResponse>(`/threads/${threadId}`, { name: title });
    return toThread(res);
  },

  deleteThread: (threadId: string) => api.delete<void>(`/threads/${threadId}`),

  sendMessageStream: async (
    threadId: string,
    payload: SendMessagePayload,
    signal: AbortSignal,
    callbacks: StreamCallbacks,
  ): Promise<void> => {
    const res = await streamPost(`/threads/${threadId}/messages`, { content: payload.content }, signal);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let sepIndex;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        if (!raw.trim()) continue;

        const parsed = parseSSEEvent(raw);
        if (!parsed) continue;

        const { event, data } = parsed;

        if (event === "user_message") {
          callbacks.onUserMessage?.(toMessage(data as MessageResponse, threadId));
        } else if (event === "intermediate_steps") {
          callbacks.onIntermediateSteps?.(data as IntermediateSteps);
        } else if (event === "delta") {
          callbacks.onDelta?.((data as { content: string }).content);
        } else if (event === "done") {
          const msg = data as MessageResponse & { id: string | null; created_at: string | null };
          callbacks.onDone?.(msg.id ? toMessage(msg as MessageResponse, threadId) : null);
        } else if (event === "error") {
          callbacks.onError?.((data as { message: string }).message || "Something went wrong.");
        }
      }
    }
  },

  sendFeedback: (threadId: string, messageId: string, rating: FeedbackRating, comment?: string) =>
    api.post<void>(`/threads/${threadId}/messages/${messageId}/feedback`, {
      rating: rating === "up" ? "like" : "dislike",
      comment,
    }),
};
