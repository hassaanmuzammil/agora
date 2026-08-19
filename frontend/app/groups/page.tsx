"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";

export default function GroupsPage() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const { groups, users, isLoading, error, createGroup, toggleMember } = useGroupMembers();
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  if (!user.is_admin) {
    return (
      <AppShell user={user} onLogout={logout}>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-secondary)]">Only admins can manage groups.</p>
        </div>
      </AppShell>
    );
  }

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      await createGroup(name);
      setNewGroupName("");
    } catch {
      setCreateError("Couldn't create group. Try again.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="border-b border-[var(--border)] px-5 py-3">
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">Groups</h1>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateGroup();
              }
            }}
            placeholder="New group name"
            disabled={isCreating}
            className="w-full max-w-xs rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          />
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim() || isCreating}
            className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {isCreating ? "Creating…" : "Create group"}
          </button>
        </div>
        {createError && <p className="mb-4 text-xs text-[var(--danger)]">{createError}</p>}

        {isLoading && <p className="text-sm text-[var(--text-secondary)]">Loading…</p>}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        {!isLoading && groups.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)]">No groups yet — create one above.</p>
        )}

        <div className="space-y-6">
          {groups.map((group) => {
            // Admins bypass group-based access entirely (see user_can_access_file /
            // resolve_allowed_sources on the backend) — their access never depends
            // on group membership, so listing them here with a checkbox that's
            // always unchecked is misleading rather than informative.
            const nonAdminUsers = users.filter((u) => !u.is_admin);

            return (
              <div key={group.id} className="rounded-lg border border-[var(--border)] p-4">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{group.name}</h2>
                {nonAdminUsers.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)]">No non-admin users yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {nonAdminUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={u.groups.some((g) => g.id === group.id)}
                          onChange={() => toggleMember(group.id, u)}
                        />
                        {u.email}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
