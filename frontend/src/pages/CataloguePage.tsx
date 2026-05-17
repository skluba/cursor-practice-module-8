import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { CatalogueGridSkeleton } from '../components/CatalogueGridSkeleton'
import * as api from '../lib/api'
import type { CatalogSort } from '../lib/catalogQuery'
import { buildCatalogListParams, parseMoneyUsdForCatalogFilter } from '../lib/catalogQuery'
import { formatUsd } from '../lib/format'
import type { CatalogMeta, Product } from '../types/api'

const PAGE_SIZE = 9

export function CataloguePage() {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<CatalogSort>('id')

  const [draftSearch, setDraftSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [draftMinUsd, setDraftMinUsd] = useState('')
  const [draftMaxUsd, setDraftMaxUsd] = useState('')
  const [appliedMinCents, setAppliedMinCents] = useState<number | null>(null)
  const [appliedMaxCents, setAppliedMaxCents] = useState<number | null>(null)

  const [toolbarErr, setToolbarErr] = useState('')

  const [items, setItems] = useState<Product[]>([])
  const [meta, setMeta] = useState<CatalogMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const params = buildCatalogListParams({
      page,
      pageSize: PAGE_SIZE,
      sort,
      q: appliedSearch,
      minPriceCents: appliedMinCents,
      maxPriceCents: appliedMaxCents,
    })

    setLoading(true)
    ;(async () => {
      try {
        const res = await api.fetchCatalogPage(params)
        if (alive) {
          setItems(res.items)
          setMeta(res.meta)
          setError('')
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Failed to load catalogue')
        }
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [page, sort, appliedSearch, appliedMinCents, appliedMaxCents])

  const canPrev = page > 1
  const canNext = meta ? page < meta.total_pages : items.length === PAGE_SIZE

  function applyFilters() {
    setToolbarErr('')

    const minP = parseMoneyUsdForCatalogFilter(draftMinUsd)
    const maxP = parseMoneyUsdForCatalogFilter(draftMaxUsd)
    if (!minP.ok || !maxP.ok) {
      setToolbarErr('Enter prices as USD amounts like 12 or 12.99, or leave empty.')
      return
    }

    const lo = minP.cents
    const hi = maxP.cents

    if (lo !== null && hi !== null && lo > hi) {
      setToolbarErr('Minimum price cannot exceed maximum price.')
      return
    }

    setAppliedSearch(draftSearch.trim())
    setAppliedMinCents(lo)
    setAppliedMaxCents(hi)
    setPage(1)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Product catalogue
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Live data from the Flask API (<code className="text-xs">GET /catalog/items</code>), with
          sort &amp; filter query params.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:flex-wrap md:items-end">
        <label className="flex min-w-[12rem] flex-1 flex-col text-sm font-medium text-slate-700">
          Sort
          <select
            aria-label="Sort catalogue"
            value={sort}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base font-normal"
            onChange={(ev) => {
              setSort(ev.target.value as CatalogSort)
              setPage(1)
            }}
          >
            <option value="id">Default (id)</option>
            <option value="title_asc">Title A–Z</option>
            <option value="title_desc">Title Z–A</option>
            <option value="price_asc">Price low → high</option>
            <option value="price_desc">Price high → low</option>
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-[2] flex-col text-sm font-medium text-slate-700">
          Search (title / SKU / description)
          <input
            aria-label="Filter by keywords"
            value={draftSearch}
            type="search"
            onChange={(ev) => setDraftSearch(ev.target.value)}
            placeholder="Keywords…"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base font-normal"
          />
        </label>
        <label className="flex min-w-[7rem] flex-1 flex-col text-sm font-medium text-slate-700">
          Min price ($)
          <input
            aria-label="Minimum price USD"
            value={draftMinUsd}
            inputMode="decimal"
            placeholder="Optional"
            onChange={(ev) => setDraftMinUsd(ev.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 font-normal tabular-nums"
          />
        </label>
        <label className="flex min-w-[7rem] flex-1 flex-col text-sm font-medium text-slate-700">
          Max price ($)
          <input
            aria-label="Maximum price USD"
            value={draftMaxUsd}
            inputMode="decimal"
            placeholder="Optional"
            onChange={(ev) => setDraftMaxUsd(ev.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 font-normal tabular-nums"
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          onClick={() => applyFilters()}
        >
          Apply filters
        </button>
      </div>

      {toolbarErr ? (
        <p role="alert" className="-mt-4 text-sm text-rose-700">
          {toolbarErr}
        </p>
      ) : null}

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading catalogue products."
          className="space-y-4"
        >
          <span className="sr-only">Loading catalogue products.</span>
          <CatalogueGridSkeleton />
          <p className="text-center text-xs text-slate-500">Synchronizing inventory…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : items.length === 0 ? (
        <p className="text-slate-600">No products available.</p>
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li
                key={p.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex flex-1 flex-col">
                  <h2 className="text-lg font-semibold text-slate-900">{p.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description ?? ''}</p>
                  <div className="mt-4 flex flex-1 flex-col gap-4">
                    <p className="text-xl font-semibold tabular-nums text-indigo-700">
                      {formatUsd(p.price_cents)}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      SKU · {p.sku}
                    </p>
                    <Link
                      to={`/catalog/${p.id}`}
                      className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      View & add to cart
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {meta ? (
            <p className="text-center text-xs text-slate-500">
              Page {meta.page} of {meta.total_pages} ({meta.total} products)
            </p>
          ) : null}
        </>
      )}
      {!error && (
        <div className={`flex items-center justify-center gap-4 ${loading ? 'opacity-60' : ''}`}>
          <button
            type="button"
            disabled={loading || !canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous page
          </button>
          <span className="text-sm tabular-nums text-slate-600">Page {page}</span>
          <button
            type="button"
            disabled={loading || !canNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
          >
            Next page
          </button>
        </div>
      )}
    </div>
  )
}
