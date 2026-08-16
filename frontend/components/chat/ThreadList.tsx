"use client";

import type { Thread } from "@/types/thread";
import { ThreadItem } from "./ThreadItem";

interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  isLoading: boolean;
  onRename: (threadId: string, title: string) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
}

export function ThreadList({ threads, activeThreadId, isLoading, onRename, onDelete }: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5 px-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-md bg-[var(--surface-hover)]" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return <p className="px-2 py-1.5 text-xs text-[var(--text-tertiary)]">No conversations yet.</p>;
  }

  return (
    <div className="space-y-0.5">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          active={thread.id === activeThreadId}
          onRename={(title) => onRename(thread.id, title)}
          onDelete={() => onDelete(thread.id)}
        />
      ))}
    </div>
  );
}
