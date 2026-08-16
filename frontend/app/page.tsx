"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { chatService } from "@/services/chat";

export default function HomePage() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const router = useRouter();

  if (isLoading) {
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

  async function handleFirstMessage(content: string) {
    const thread = await chatService.createThread();
    sessionStorage.setItem(`draft:${thread.id}`, content);
    router.push(`/thread/${thread.id}`);
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <ChatWindow messages={[]} onSend={handleFirstMessage} />
    </AppShell>
  );
}
