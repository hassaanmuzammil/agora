"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFiles } from "@/hooks/useFiles";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppShell } from "@/components/layout/AppShell";
import { FileTable } from "@/components/files/FileTable";
import { UploadDialog } from "@/components/files/UploadDialog";
import { ConfirmDialog } from "@/components/files/ConfirmDialog";
import { ManageAccessDialog } from "@/components/files/ManageAccessDialog";
import { filesService } from "@/services/files";
import type { FileItem } from "@/types/file";

export default function FilesPage() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const { files, isLoading, isUploading, upload, remove, updateGroups } = useFiles();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [manageAccessFile, setManageAccessFile] = useState<FileItem | null>(null);

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

  async function handlePreview(file: FileItem) {
    await filesService.preview(file.id);
  }

  async function handleDownload(file: FileItem) {
    await filesService.download(file.id, file.name);
  }

  function handleDelete(file: FileItem) {
    setPendingDelete(file);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await remove(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell user={user} onLogout={logout}>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h1 className="text-sm font-semibold text-[var(--text-primary)]">Files</h1>
        {files.length > 0 && (
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Upload File
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <FileTable
          files={files}
          isLoading={isLoading}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onManageAccess={user.is_admin ? setManageAccessFile : undefined}
          onUploadClick={() => setUploadOpen(true)}
        />
      </div>

      <UploadDialog
        open={uploadOpen}
        isUploading={isUploading}
        onUpload={upload}
        onClose={() => setUploadOpen(false)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete file"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        isBusy={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <ManageAccessDialog
        key={manageAccessFile?.id ?? "none"}
        file={manageAccessFile}
        onSave={updateGroups}
        onClose={() => setManageAccessFile(null)}
      />
    </AppShell>
  );
}
