"use client";

import Link from "next/link";
import { useState } from "react";
import type { Thread } from "@/types/thread";

interface ThreadItemProps {
  thread: Thread;
  active: boolean;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ThreadItem({ thread, active, onRename, onDelete }: ThreadItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [menuOpen, setMenuOpen] = useState(false);

  async function commitRename() {
    setIsEditing(false);
    if (title.trim() && title !== thread.title) {
      await onRename(title.trim());
    } else {
      setTitle(thread.title);
    }
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") {
            setTitle(thread.title);
            setIsEditing(false);
          }
        }}
        className="w-full rounded-md border border-[var(--accent)] bg-white px-2 py-1.5 text-sm outline-none"
      />
    );
  }

  return (
    <div
      className={`group relative flex items-center rounded-md text-sm ${
        active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <Link href={`/thread/${thread.id}`} className="flex-1 truncate px-2 py-1.5">
        {thread.title || "Untitled conversation"}
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          setMenuOpen((v) => !v);
        }}
        className="mr-1 rounded px-1.5 py-1 text-xs opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)]"
      >
        •••
      </button>
      {menuOpen && (
        <div
          className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-[var(--border)] bg-white py-1 text-[var(--text-primary)] shadow-sm"
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              setIsEditing(true);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)]"
          >
            Rename
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-hover)]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
