/** Streamed instantly while a page waits for the API, so a slow first request never shows a blank screen. */
export default function Loading() {
  return (
    <main className="grid h-dvh place-items-center" aria-busy aria-label="Loading">
      <span className="size-6 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
    </main>
  );
}
