"use client";

import { useEffect, useState } from "react";
import { groupsService } from "@/services/groups";
import type { Group } from "@/services/groups";
import type { FileItem } from "@/types/file";

interface ManageAccessDialogProps {
  file: FileItem | null;
  onSave: (fileId: string, groupIds: string[]) => Promise<unknown>;
  onClose: () => void;
}

export function ManageAccessDialog({ file, onSave, onClose }: ManageAccessDialogProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  // Derived directly from the (remounted-per-file, see `key` at the call
  // site) initial render rather than synced via effect — avoids a
  // setState-in-effect render cascade for state that's really just a copy
  // of a prop at mount time.
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(() => file?.groups.map((g) => g.id) ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setGroupsError(null);
      groupsService
        .list()
        .then(setGroups)
        .catch(() => {
          setGroups([]);
          setGroupsError("Couldn't load groups. Try again.");
        });
    }
  }, [file]);

  if (!file) return null;

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  }

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    setIsCreatingGroup(true);
    setCreateGroupError(null);
    try {
      const group = await groupsService.create({ name });
      setGroups((prev) => [...prev, group]);
      setSelectedGroupIds((prev) => [...prev, group.id]);
      setNewGroupName("");
    } catch {
      setCreateGroupError("Couldn't create group. Try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(file!.id, selectedGroupIds);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Manage access</h2>
        <p className="mb-3 truncate text-xs text-[var(--text-secondary)]">{file.name}</p>

        {groupsError && <p className="mb-2 text-xs text-[var(--danger)]">{groupsError}</p>}

        {groups.length === 0 && !groupsError ? (
          <p className="mb-3 text-sm text-[var(--text-tertiary)]">No groups exist yet.</p>
        ) : (
          <div className="mb-3 space-y-1.5">
            {groups.map((group) => (
              <label key={group.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(group.id)}
                  onChange={() => toggleGroup(group.id)}
                />
                {group.name}
              </label>
            ))}
          </div>
        )}

        <div className="mb-3 border-t border-[var(--border)] pt-3">
          <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">Create a new group</p>
          <div className="flex gap-2">
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
              placeholder="Group name"
              disabled={isCreatingGroup}
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || isCreatingGroup}
              className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {isCreatingGroup ? "Creating…" : "Create"}
            </button>
          </div>
          {createGroupError && <p className="mt-1.5 text-xs text-[var(--danger)]">{createGroupError}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
