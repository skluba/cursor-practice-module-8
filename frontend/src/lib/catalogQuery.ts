/** Values accepted by GET /catalog/items `sort` (see backend CatalogListQuerySchema). */
export type CatalogSort = 'id' | 'title_asc' | 'title_desc' | 'price_asc' | 'price_desc'

export type CatalogQueryOptions = {
  page: number
  pageSize: number
  sort?: CatalogSort
  /** Trimmed applied search string; empty omits `q`. */
  q?: string
  /** Whole cents; null/undefined omits param. */
  minPriceCents?: number | null
  maxPriceCents?: number | null
}

export function buildCatalogListParams(opts: CatalogQueryOptions): URLSearchParams {
  const {
    page,
    pageSize,
    sort = 'id',
    q = '',
    minPriceCents = null,
    maxPriceCents = null,
  } = opts
  const p = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort,
  })

  const qt = typeof q === 'string' ? q.trim() : ''
  if (qt) {
    p.set('q', qt.slice(0, 200))
  }

  if (
    typeof minPriceCents === 'number' &&
    !Number.isNaN(minPriceCents) &&
    minPriceCents >= 0
  ) {
    p.set('min_price_cents', String(Math.floor(minPriceCents)))
  }
  if (
    typeof maxPriceCents === 'number' &&
    !Number.isNaN(maxPriceCents) &&
    maxPriceCents >= 0
  ) {
    p.set('max_price_cents', String(Math.floor(maxPriceCents)))
  }

  return p
}

/** Parse USD text for optional price filters (`12` or `12.99`). */
export type MoneyParseOk =
  | { ok: true; cents: number | null }
  | { ok: false; reason: 'invalid' }

export function parseMoneyUsdForCatalogFilter(raw: string): MoneyParseOk {
  const t = raw.trim()
  if (!t) {
    return { ok: true, cents: null }
  }
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, reason: 'invalid' }
  }
  return { ok: true, cents: Math.round(n * 100) }
}
