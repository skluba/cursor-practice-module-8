/** Placeholder grid while catalogue products are fetching (better perceived perf than lone text). */
export function CatalogueGridSkeleton() {
  return (
    <ul
      className="grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
      data-testid="catalog-grid-skeleton"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <li
          key={i}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="h-6 w-[70%] rounded bg-slate-200" />
          <div className="mt-2 h-10 w-full rounded bg-slate-100" />
          <div className="mt-auto flex flex-1 flex-col gap-4 pt-8">
            <div className="h-8 w-[40%] rounded bg-slate-200" />
            <div className="h-10 w-full rounded-lg bg-indigo-200/40" />
          </div>
        </li>
      ))}
    </ul>
  )
}
