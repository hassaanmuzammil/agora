"use client";

import { useCallback, useEffect, useState } from "react";
import { chatService } from "@/services/chat";
import type { Thread } from "@/types/thread";

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await chatService.listThreads();
      setThreads(data);
    } catch {
      setError("Couldn't load conversations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const renameThread = useCallback(async (threadId: string, title: string) => {
    const updated = await chatService.renameThread(threadId, title);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, ...updated } : t)));
  }, []);

  const deleteThread = useCallback(async (threadId: string) => {
    await chatService.deleteThread(threadId);
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
  }, []);

  return { threads, isLoading, error, refresh, renameThread, deleteThread };
}
