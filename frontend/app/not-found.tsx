import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] px-4 text-center">
      <p className="font-mono text-sm text-[var(--text-tertiary)]">404</p>
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Page not found</h1>
      <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
        Back to chat
      </Link>
    </div>
  );
}
