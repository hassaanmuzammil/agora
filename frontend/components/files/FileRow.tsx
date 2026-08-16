"use client";

import type { FileItem } from "@/types/file";

interface FileRowProps {
  file: FileItem;
  onPreview: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onManageAccess?: (file: FileItem) => void;
}

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function AccessIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 11V7a5 5 0 0 0-10 0v4" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  );
}

export function FileRow({ file, onPreview, onDownload, onDelete, onManageAccess }: FileRowProps) {
  return (
    <tr className="border-b border-[var(--border)] text-sm hover:bg-[var(--surface-hover)]">
      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{file.name}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{file.mimeType || "—"}</td>
      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatSize(file.size)}</td>
      <td className="px-4 py-2.5 text-[var(--text-tertiary)]">{file.uploadedAt || "—"}</td>
      <td className="px-4 py-2.5">
        {file.groups.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {file.groups.map((g) => (
              <span
                key={g.id}
                className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]"
              >
                {g.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-tertiary)]">Private</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPreview(file)}
            aria-label="Preview file"
            title="Preview"
            className="flex items-center text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <PreviewIcon />
          </button>
          <button
            onClick={() => onDownload(file)}
            aria-label="Download file"
            title="Download"
            className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <DownloadIcon />
          </button>
          {onManageAccess && (
            <button
              onClick={() => onManageAccess(file)}
              aria-label="Manage access"
              title="Manage access"
              className="flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <AccessIcon />
            </button>
          )}
          <button
            onClick={() => onDelete(file)}
            aria-label="Delete file"
            title="Delete"
            className="flex items-center text-[var(--text-secondary)] hover:text-[var(--danger)]"
          >
            <DeleteIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}
