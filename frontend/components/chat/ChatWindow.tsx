"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedbackRating, Message as MessageType, RagSource } from "@/types/thread";
import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { SourcesPanel } from "./SourcesPanel";

interface ChatWindowProps {
  messages: MessageType[];
  onSend: (content: string) => void;
  onFeedback?: (messageId: string, rating: FeedbackRating) => Promise<void>;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

export function ChatWindow({ messages, onSend, onFeedback, onStop, isStreaming, disabled }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeSource, setActiveSource] = useState<RagSource | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <p className="mb-6 font-mono text-2xl font-medium text-[var(--text-primary)] cursor-blink">
            What can I help with?
          </p>
          <div className="w-full max-w-2xl">
            <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} disabled={disabled} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onFeedback={
                    message.role === "assistant" && onFeedback
                      ? (rating) => onFeedback(message.id, rating)
                      : undefined
                  }
                  onSourceClick={setActiveSource}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
          <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} disabled={disabled} />
        </>
      )}
      <SourcesPanel source={activeSource} onClose={() => setActiveSource(null)} />
    </div>
  );
}
