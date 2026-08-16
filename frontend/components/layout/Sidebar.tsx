"use client";

import { useState } from "react";
import Link from "next/link";
import { useThreads } from "@/hooks/useThreads";
import { ThreadList } from "@/components/chat/ThreadList";

interface SidebarProps {
  activeThreadId?: string;
}

export function Sidebar({ activeThreadId }: SidebarProps) {
  const { threads, isLoading, renameThread, deleteThread } = useThreads();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-[var(--border)] bg-[var(--surface)] py-3">
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          »
        </button>
        <Link
          href="/"
          aria-label="New chat"
          title="New chat"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-[var(--accent)] hover:bg-[var(--surface-hover)]"
        >
          +
        </Link>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-3 flex items-center gap-2">
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        >
          <span className="text-[var(--accent)]">+</span> New Chat
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          «
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          isLoading={isLoading}
          onRename={renameThread}
          onDelete={deleteThread}
        />
      </div>
    </aside>
  );
}
