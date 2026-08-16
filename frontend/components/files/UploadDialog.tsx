"use client";

import { useEffect, useRef, useState } from "react";
import { groupsService } from "@/services/groups";
import type { Group } from "@/services/groups";

interface UploadDialogProps {
  open: boolean;
  isUploading: boolean;
  onUpload: (file: File, groupIds: string[]) => Promise<unknown>;
  onClose: () => void;
}

export function UploadDialog({ open, isUploading, onUpload, onClose }: UploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      groupsService.list().then(setGroups).catch(() => setGroups([]));
    }
  }, [open]);

  if (!open) return null;

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setError(null);
    try {
      await onUpload(selectedFile, selectedGroupIds);
      setSelectedFile(null);
      setSelectedGroupIds([]);
      onClose();
    } catch {
      setError("Upload failed. Try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Upload file</h2>

        <button
          onClick={() => inputRef.current?.click()}
          className="mb-3 w-full rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {selectedFile ? selectedFile.name : "Choose a file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />

        {groups.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
              Who can access this file?
            </p>
            <div className="space-y-1.5">
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
            {selectedGroupIds.length === 0 && (
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                No groups selected — only you and admins will be able to see this file.
              </p>
            )}
          </div>
        )}

        {error && <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {isUploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
