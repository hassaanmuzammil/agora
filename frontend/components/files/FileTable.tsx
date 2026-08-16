"use client";

import type { FileItem } from "@/types/file";
import { FileRow } from "./FileRow";

interface FileTableProps {
  files: FileItem[];
  isLoading: boolean;
  onPreview: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onManageAccess?: (file: FileItem) => void;
  onUploadClick: () => void;
}

const COLUMNS = ["Name", "MIME Type", "Size", "Uploaded At", "Access", "Actions"];

export function FileTable({ files, isLoading, onPreview, onDownload, onDelete, onManageAccess, onUploadClick }: FileTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-[var(--surface-hover)]" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
        <p className="text-sm text-[var(--text-secondary)]">No files uploaded yet.</p>
        <button
          onClick={onUploadClick}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Upload File
        </button>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          {COLUMNS.map((col) => (
            <th key={col} className="px-4 py-2.5 font-medium">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            onPreview={onPreview}
            onDownload={onDownload}
            onDelete={onDelete}
            onManageAccess={onManageAccess}
          />
        ))}
      </tbody>
    </table>
  );
}
