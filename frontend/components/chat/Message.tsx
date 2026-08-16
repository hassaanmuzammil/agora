"use client";

import { useState } from "react";
import type { FeedbackRating, Message as MessageType, RagSource } from "@/types/thread";
import { MarkdownContent } from "./MarkdownContent";
import { IntermediateSteps } from "./IntermediateSteps";

interface MessageProps {
  message: MessageType;
  onFeedback?: (rating: FeedbackRating) => Promise<void>;
  onSourceClick?: (source: RagSource) => void;
}

function ThumbsUpIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L13 22h0a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1 -2 -2V4a2 2 0 0 1 2 -2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function Message({ message, onFeedback, onSourceClick }: MessageProps) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function handleFeedback(rating: FeedbackRating) {
    if (feedback === rating) return; // backend has no "remove feedback" endpoint
    setFeedback(rating);
    await onFeedback?.(rating);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const iconButtonClass = (active: boolean) =>
    `flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
      active
        ? "text-[var(--text-primary)]"
        : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
    }`;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {!isUser && message.intermediateSteps && (
          <IntermediateSteps steps={message.intermediateSteps} onSourceClick={(s) => onSourceClick?.(s)} />
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "whitespace-pre-wrap text-sm leading-relaxed bg-[var(--accent)] text-white"
              : "bg-[var(--surface)] text-[var(--text-primary)]"
          }`}
        >
          {isUser ? message.content : <MarkdownContent content={message.content} />}
        </div>

        {!isUser && (
          <div className="flex items-center gap-0.5 px-1">
            <button onClick={handleCopy} aria-label="Copy response" title="Copy" className={iconButtonClass(false)}>
              <CopyIcon copied={copied} />
            </button>
            {onFeedback && (
              <>
                <button
                  onClick={() => handleFeedback("up")}
                  aria-label="Good response"
                  title="Good response"
                  className={iconButtonClass(feedback === "up")}
                >
                  <ThumbsUpIcon filled={feedback === "up"} />
                </button>
                <button
                  onClick={() => handleFeedback("down")}
                  aria-label="Bad response"
                  title="Bad response"
                  className={iconButtonClass(feedback === "down")}
                >
                  <ThumbsDownIcon filled={feedback === "down"} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
