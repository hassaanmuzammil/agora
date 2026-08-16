"use client";

import { useState } from "react";
import Image from "next/image";
import { Navigation } from "./Navigation";
import type { User } from "@/types/auth";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function Header({ user, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-4">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Image src="/logo.jpg" alt="Agora" width={22} height={22} className="rounded-sm" />
          Agora
        </span>
        <Navigation />
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-medium text-[var(--accent)]">
            {(user?.email || "?").charAt(0).toUpperCase()}
          </span>
          <span className="max-w-[140px] truncate">{user?.email || "Account"}</span>
          <span className="text-xs text-[var(--text-tertiary)]">▾</span>
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-52 rounded-md border border-[var(--border)] bg-white py-1 shadow-sm"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div className="truncate border-b border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)]">
              {user?.email || "Account"}
            </div>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              <LogOutIcon />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
