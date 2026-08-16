"use client";

import { filesService } from "@/services/files";
import type { RagSource } from "@/types/thread";

interface SourcesPanelProps {
  source: RagSource | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export function SourcesPanel({ source, onClose }: SourcesPanelProps) {
  if (!source) return null;

  const metadataEntries = Object.entries(source.metadata || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/10" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-30 flex h-full w-full max-w-sm flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Source</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">{source.name}</p>

          <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-[var(--text-tertiary)]">
            {source.page !== undefined && source.page !== null && source.page !== "" && (
              <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5">page: {source.page}</span>
            )}
            {metadataEntries.map(([k, v]) => (
              <span key={k} className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5">
                {k}: {String(v)}
              </span>
            ))}
          </div>

          {source.file_id && (
            <button
              onClick={() => filesService.preview(source.file_id!)}
              className="mb-3 flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              <FileIcon />
              Preview file
            </button>
          )}

          <div className="whitespace-pre-wrap rounded-md bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--text-primary)]">
            {source.content}
          </div>
        </div>
      </aside>
    </>
  );
}
