/**
 * Fallback while lazy route chunks load. Keep lightweight vs page JS (no catalogue imports).
 */
export function PageLoadingFallback() {
  return (
    <div className="space-y-6 py-10" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading page…</span>
      <div className="animate-pulse space-y-3">
        <div className="h-10 w-[min(28rem,100%)] rounded-lg bg-slate-200" />
        <div className="h-4 w-[min(20rem,100%)] rounded bg-slate-100" />
        <div className="mx-auto mt-14 h-12 w-12 rounded-full border-2 border-slate-300 border-t-indigo-600 motion-safe:animate-spin" />
      </div>
    </div>
  )
}
