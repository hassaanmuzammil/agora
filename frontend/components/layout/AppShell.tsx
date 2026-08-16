"use client";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { User } from "@/types/auth";

interface AppShellProps {
  user: User;
  onLogout: () => void;
  activeThreadId?: string;
  children: React.ReactNode;
}

export function AppShell({ user, onLogout, activeThreadId, children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      <Header user={user} onLogout={onLogout} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeThreadId={activeThreadId} />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
