"use client";

/** Shown when a page can't load its data — most often because the API is waking up. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="text-[24px] text-ink">We couldn&apos;t reach the server</h1>
        <p className="mt-2 max-w-[440px] text-[15px] text-ink-2">
          It may be waking up after a quiet spell — this can take up to a minute. Please try again.
        </p>
        <button type="button" onClick={reset}
          className="mt-6 h-9 rounded-lg bg-ink px-4 text-[14px] font-medium text-surface hover:opacity-90">
          Try again
        </button>
      </div>
    </main>
  );
}
