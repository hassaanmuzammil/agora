"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { chatService } from "@/services/chat";
import type { FeedbackRating, Message } from "@/types/thread";

export default function ThreadPage() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const threadId = params.threadId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const draftHandledRef = useRef(false);

  const loadThread = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const thread = await chatService.getThread(threadId);
      setMessages(thread.messages);
    } catch {
      setError("Couldn't load this conversation.");
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadThread();
    }
  }, [isAuthenticated, loadThread]);

  const handleSend = useCallback(
    (content: string) => {
      const userTempId = `temp-user-${crypto.randomUUID()}`;
      const assistantTempId = `temp-assistant-${crypto.randomUUID()}`;

      setMessages((prev) => [
        ...prev,
        { id: userTempId, threadId, role: "user", content },
        { id: assistantTempId, threadId, role: "assistant", content: "" },
      ]);

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      chatService
        .sendMessageStream(threadId, { content }, controller.signal, {
          onUserMessage: (msg) => {
            setMessages((prev) => prev.map((m) => (m.id === userTempId ? msg : m)));
          },
          onIntermediateSteps: (steps) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantTempId ? { ...m, intermediateSteps: steps } : m)),
            );
          },
          onDelta: (delta) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantTempId ? { ...m, content: m.content + delta } : m)),
            );
          },
          onDone: (msg) => {
            setMessages((prev) =>
              prev
                .map((m) => (m.id === assistantTempId && msg ? msg : m))
                // Drop the placeholder only if it never received real content
                // or an error message — otherwise a null `done` (e.g. the
                // "no API key" case) would wipe out the error text onError
                // just wrote into it.
                .filter((m) => m.id !== assistantTempId || Boolean(msg) || Boolean(m.content)),
            );
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantTempId ? { ...m, content: m.content || `⚠️ ${message}` } : m)),
            );
          },
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantTempId && !m.content ? { ...m, content: "⚠️ Something went wrong." } : m,
            ),
          );
        })
        .finally(() => {
          setIsStreaming(false);
          abortRef.current = null;
        });
    },
    [threadId],
  );

  useEffect(() => {
    if (isLoading || draftHandledRef.current) return;
    const key = `draft:${threadId}`;
    const draft = sessionStorage.getItem(key);
    if (draft) {
      draftHandledRef.current = true;
      sessionStorage.removeItem(key);
      handleSend(draft);
    }
  }, [isLoading, threadId, handleSend]);

  function handleStop() {
    abortRef.current?.abort();
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <LoginForm
        onSubmit={async (email, password) => {
          await login({ email, password });
        }}
      />
    );
  }

  async function handleFeedback(messageId: string, rating: FeedbackRating) {
    await chatService.sendFeedback(threadId, messageId, rating);
  }

  return (
    <AppShell user={user} onLogout={logout} activeThreadId={threadId}>
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-secondary)]">Loading conversation…</p>
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <button onClick={() => router.push("/")} className="text-sm text-[var(--accent)] hover:underline">
            Back to new chat
          </button>
        </div>
      ) : (
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          onFeedback={handleFeedback}
        />
      )}
    </AppShell>
  );
}
