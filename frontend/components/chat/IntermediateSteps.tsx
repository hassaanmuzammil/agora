"use client";

import { useState } from "react";
import type { IntermediateSteps as IntermediateStepsType, RagSource } from "@/types/thread";

interface IntermediateStepsProps {
  steps: IntermediateStepsType;
  onSourceClick: (source: RagSource) => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function metadataBadges(source: RagSource): string[] {
  const badges: string[] = [];
  if (source.page !== undefined && source.page !== null && source.page !== "") {
    badges.push(`page: ${source.page}`);
  }
  for (const [key, value] of Object.entries(source.metadata || {})) {
    if (value === undefined || value === null || value === "") continue;
    badges.push(`${key}: ${value}`);
  }
  return badges;
}

export function IntermediateSteps({ steps, onSourceClick }: IntermediateStepsProps) {
  const [open, setOpen] = useState(false);
  const sourceCount = steps.sources?.length || 0;

  const summary = steps.rejected
    ? "Query not answerable from documents"
    : `${sourceCount} source${sourceCount === 1 ? "" : "s"} retrieved`;

  return (
    <div className="w-full max-w-2xl self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ChevronIcon open={open} />
        <span>{summary}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--border)] px-3 py-2.5">
          <div>
            <p className="mb-1 font-semibold text-[var(--text-secondary)]">Question</p>
            {steps.rejected ? (
              <p className="text-[var(--text-tertiary)]">{steps.rejection_reason}</p>
            ) : (
              <p className="font-mono text-[var(--text-primary)]">{steps.clarified_question}</p>
            )}
          </div>

          {sourceCount > 0 && (
            <div>
              <p className="mb-1 font-semibold text-[var(--text-secondary)]">Retrieved sources ({sourceCount})</p>
              <div className="space-y-1">
                {steps.sources.map((source, i) => (
                  <button
                    key={i}
                    onClick={() => onSourceClick(source)}
                    className="flex w-full flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
                  >
                    <span className="text-[var(--accent)] underline underline-offset-2">{source.name}</span>
                    {metadataBadges(source).map((badge) => (
                      <span
                        key={badge}
                        className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[var(--text-tertiary)]"
                      >
                        {badge}
                      </span>
                    ))}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
