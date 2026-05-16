import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import * as api from '../lib/api'
import { formatUsd } from '../lib/format'
import type { CatalogMeta, Product } from '../types/api'

export function CataloguePage() {
  const [page, setPage] = useState(1)
  const pageSize = 9

  const [items, setItems] = useState<Product[]>([])
  const [meta, setMeta] = useState<CatalogMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    setLoading(true)
    ;(async () => {
      try {
        const res = await api.fetchCatalogPage(q)
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
  }, [page])

  const canPrev = page > 1
  const canNext = meta ? page < meta.total_pages : items.length === pageSize

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Product catalogue
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Live data from the Flask API (<code className="text-xs">GET /catalog/items</code>).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading products…</p>
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
      {!loading && !error && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous page
          </button>
          <span className="text-sm tabular-nums text-slate-600">Page {page}</span>
          <button
            type="button"
            disabled={!canNext}
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
