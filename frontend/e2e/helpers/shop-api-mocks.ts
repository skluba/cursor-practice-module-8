import type { Page, Route } from '@playwright/test'

export const LOGIN_TOKEN = 'e2e-access-token'

function bearer(req: Route): string {
  const h = req.request().headers()['authorization'] ?? ''
  return h.replace(/^Bearer\s+/i, '').trim()
}

function authed(tok: string): boolean {
  return tok === LOGIN_TOKEN
}

const SAMPLE_USER_ME = {
  id: 1,
  email: 'shopper@test.dev',
  registration_complete: true,
  first_name: 'Sam',
  last_name: 'Shopper',
  phone: '+1',
  shipping_address: { street: '1 Lane', city: 'X', postal_code: '1', country: 'US' },
}

const P1 = {
  id: 1,
  sku: 'E2E-A',
  title: 'E2E Ceramic Mug',
  description: null,
  price_cents: 899,
  active: true,
} as const

const P2 = {
  id: 2,
  sku: 'E2E-B',
  title: 'E2E Canvas Tote',
  description: null,
  price_cents: 1499,
  active: true,
} as const

/** Extra rows split across pages (`page_size=9`) and exercised by filters/sorting. */
const FILLER_START_ID = 3
const MOCK_CATALOG: Array<typeof P1 | typeof P2 | (typeof P1 & { readonly id: number })> = [
  P1,
  P2,
  ...Array.from({ length: 12 - FILLER_START_ID + 1 }, (_, j) => {
    const id = FILLER_START_ID + j
    return {
      id,
      sku: `E2E-X${id}`,
      title: `Filler item ${id}`,
      description: null,
      price_cents: 500 + id * 50,
      active: true,
    } as const
  }),
]

/** Distinct SKU for search filter tests (Zen + Aero). Inject into stable ids inside filler range. */
const ZX = MOCK_CATALOG.find((x) => x.id === 5)!
const ZEN_OVERRIDE = {
  ...ZX,
  sku: 'E2E-ZEN',
  title: 'Zen Planter Shelf',
  price_cents: 3299,
} as const

const WX = MOCK_CATALOG.find((x) => x.id === 6)!
const LOW_OVERRIDE = {
  ...WX,
  sku: 'E2E-LOW',
  title: 'Budget Desk Kit',
  price_cents: 349,
  description: 'Compact starter tray',
} as const

const VX = MOCK_CATALOG.find((x) => x.id === 7)!
const AERO_OVERRIDE = {
  ...VX,
  sku: 'E2E-AERO',
  title: 'Aero Kettle Pro',
  price_cents: 4599,
  description: 'Coffee lovers upgrade',
} as const

type MockSeedRow = (typeof MOCK_CATALOG)[number]

function applyNamedCatalogOverrides(row: MockSeedRow) {
  if (row.id === 5) return ZEN_OVERRIDE
  if (row.id === 6) return LOW_OVERRIDE
  if (row.id === 7) return AERO_OVERRIDE
  return row
}

const MOCK_CATALOG_INDEXED = MOCK_CATALOG.map(applyNamedCatalogOverrides)

function productById(pid: number) {
  return MOCK_CATALOG_INDEXED.find((p) => p.id === pid) ?? null
}

const ALLOWED_SORT = new Set(['id', 'title_asc', 'title_desc', 'price_asc', 'price_desc'])

type CatalogIndexedRow = (typeof MOCK_CATALOG_INDEXED)[number]

type JsonErrorEnvelope = { status: number; body: Record<string, unknown> }

function cloneCatalogIndexed(): CatalogIndexedRow[] {
  return MOCK_CATALOG_INDEXED.map((r) => ({ ...r }))
}

function readSort(params: URLSearchParams): JsonErrorEnvelope | { sort: string } {
  const sort = params.get('sort') ?? 'id'
  if (!ALLOWED_SORT.has(sort)) {
    return {
      status: 422,
      body: { message: 'Invalid sort.', errors: { sort: ['Invalid choice.'] } },
    }
  }
  return { sort }
}

function readPriceBand(
  params: URLSearchParams,
): JsonErrorEnvelope | { lo: number | null; hi: number | null } {
  const minPc = params.get('min_price_cents')
  const maxPc = params.get('max_price_cents')
  let lo: number | null = null
  let hi: number | null = null
  if (minPc !== null && minPc !== '') {
    const n = Number(minPc)
    if (Number.isNaN(n)) {
      return { status: 422, body: { message: 'Bad min_price_cents.' } }
    }
    lo = n
  }
  if (maxPc !== null && maxPc !== '') {
    const n = Number(maxPc)
    if (Number.isNaN(n)) {
      return { status: 422, body: { message: 'Bad max_price_cents.' } }
    }
    hi = n
  }
  if (lo !== null && hi !== null && lo > hi) {
    return {
      status: 422,
      body: { message: 'min_price_cents cannot exceed max_price_cents.' },
    }
  }
  return { lo, hi }
}

function filterCatalogByKeyword(rows: CatalogIndexedRow[], qRaw: string): CatalogIndexedRow[] {
  const q = qRaw.trim().toLowerCase()
  if (!q.length) return rows
  return rows.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q),
  )
}

function filterCatalogByPriceRange(
  rows: CatalogIndexedRow[],
  lo: number | null,
  hi: number | null,
): CatalogIndexedRow[] {
  let out = rows
  if (lo !== null) out = out.filter((r) => r.price_cents >= lo)
  if (hi !== null) out = out.filter((r) => r.price_cents <= hi)
  return out
}

function compareCatalogSorted(a: CatalogIndexedRow, b: CatalogIndexedRow, sort: string): number {
  switch (sort) {
    case 'title_asc':
      return a.title.localeCompare(b.title, 'en') || a.id - b.id
    case 'title_desc':
      return b.title.localeCompare(a.title, 'en') || b.id - a.id
    case 'price_asc':
      return a.price_cents - b.price_cents || a.id - b.id
    case 'price_desc':
      return b.price_cents - a.price_cents || b.id - a.id
    default:
      return a.id - b.id
  }
}

function stableSortCatalog(rows: CatalogIndexedRow[], sort: string): void {
  rows.sort((a, b) => compareCatalogSorted(a, b, sort))
}

function readPagination(params: URLSearchParams): { pageNum: number; pageSize: number } {
  const pageNumRaw = Number(params.get('page') ?? '1')
  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw >= 1 ? pageNumRaw : 1
  const psRaw = Number(params.get('page_size') ?? '20')
  const pageSize =
    Number.isFinite(psRaw) && psRaw >= 1 ? Math.min(100, Math.floor(psRaw)) : 20
  return { pageNum, pageSize }
}

function isJsonError(value: JsonErrorEnvelope | object): value is JsonErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false
  return 'status' in value && typeof Reflect.get(value, 'status') === 'number'
}

function normalizeCatalogRows(url: URL): { body: Record<string, unknown>; status?: number } {
  const sortResult = readSort(url.searchParams)
  if (isJsonError(sortResult)) return sortResult

  const bandResult = readPriceBand(url.searchParams)
  if (isJsonError(bandResult)) return bandResult

  let rows = cloneCatalogIndexed()
  rows = filterCatalogByKeyword(rows, url.searchParams.get('q') ?? '')
  rows = filterCatalogByPriceRange(rows, bandResult.lo, bandResult.hi)
  stableSortCatalog(rows, sortResult.sort)

  const { pageNum, pageSize } = readPagination(url.searchParams)
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const slice = rows.slice((pageNum - 1) * pageSize, pageNum * pageSize)

  return {
    body: {
      items: slice,
      meta: { page: pageNum, page_size: pageSize, total, total_pages: totalPages },
    },
  }
}

export type MockOptions = {
  /** Force catalogue list GET to HTTP failure with JSON message */
  catalogListError?: boolean
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  const jsonHeaders =
    status === 204 ? undefined : { 'Content-Type': 'application/json' }
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
    headers: jsonHeaders,
  })
}

type CatalogRow = (typeof MOCK_CATALOG_INDEXED)[number]

type CartLineInner = {
  lineId: number
  qty: number
  product: CatalogRow
}

type CartState = {
  nextLineId: number
  lines: CartLineInner[]
}

type MockRouteContext = {
  route: Route
  req: ReturnType<Route['request']>
  url: URL
  path: string
  method: string
}

function buildCartPayload(lines: CartLineInner[]) {
  const payloadLines = lines.map((ln) => ({
    id: ln.lineId,
    quantity: ln.qty,
    product: {
      id: ln.product.id,
      sku: ln.product.sku,
      title: ln.product.title,
      price_cents: ln.product.price_cents,
    },
  }))
  const quantity_total = lines.reduce((sum, ln) => sum + ln.qty, 0)
  const estimated_total_cents = lines.reduce(
    (sum, ln) => sum + ln.product.price_cents * ln.qty,
    0,
  )
  return {
    lines: payloadLines,
    line_count: payloadLines.length,
    quantity_total,
    estimated_total_cents,
  }
}

async function handleCatalogItemsList(
  ctx: MockRouteContext,
  opts: MockOptions,
): Promise<boolean> {
  if (ctx.method !== 'GET' || ctx.path !== '/api/v1/catalog/items') return false
  if (opts.catalogListError) {
    await fulfillJson(ctx.route, { message: 'Upstream inventory offline.' }, 502)
    return true
  }
  const payload = normalizeCatalogRows(ctx.url)
  const st = payload.status ?? 200
  await fulfillJson(ctx.route, payload.body, st)
  return true
}

async function handleCatalogItemDetail(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'GET' || !/^\/api\/v1\/catalog\/items\/\d+$/.test(ctx.path)) return false
  const id = Number(ctx.path.split('/').pop())
  const p = productById(id)
  if (!p) {
    await fulfillJson(ctx.route, { message: 'Not found.' }, 404)
    return true
  }
  await fulfillJson(ctx.route, p)
  return true
}

async function handleAuthLogin(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'POST' || ctx.path !== '/api/v1/auth/login') return false
  const raw = ctx.req.postData() ?? ''
  if (raw.includes('fail@')) {
    await fulfillJson(ctx.route, { message: 'Invalid credentials.' }, 401)
    return true
  }
  await fulfillJson(ctx.route, { access_token: LOGIN_TOKEN })
  return true
}

async function handleRegisterStart(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'POST' || ctx.path !== '/api/v1/auth/register/start') return false
  await fulfillJson(ctx.route, { access_token: 'wiz-start' })
  return true
}

async function handleRegisterProfile(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'POST' || !ctx.path.endsWith('/auth/register/profile')) return false
  await fulfillJson(ctx.route, SAMPLE_USER_ME)
  return true
}

async function handleRegisterShipping(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'POST' || !ctx.path.endsWith('/auth/register/shipping')) return false
  await fulfillJson(ctx.route, SAMPLE_USER_ME)
  return true
}

async function handleRegisterComplete(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'POST' || !ctx.path.endsWith('/auth/register/complete')) return false
  await fulfillJson(ctx.route, { access_token: LOGIN_TOKEN })
  return true
}

async function handleAuthMe(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'GET' || ctx.path !== '/api/v1/auth/me') return false
  if (!authed(bearer(ctx.route))) {
    await fulfillJson(ctx.route, { message: 'Unauthorized.' }, 401)
    return true
  }
  await fulfillJson(ctx.route, SAMPLE_USER_ME)
  return true
}

async function handleAuthLogout(ctx: MockRouteContext): Promise<boolean> {
  if (ctx.method !== 'POST' || ctx.path !== '/api/v1/auth/logout') return false
  await ctx.route.fulfill({ status: 204 })
  return true
}

async function handleCartGet(ctx: MockRouteContext, cart: CartState): Promise<boolean> {
  if (ctx.method !== 'GET' || ctx.path !== '/api/v1/cart') return false
  if (!authed(bearer(ctx.route))) {
    await fulfillJson(ctx.route, { message: 'Sign in.' }, 401)
    return true
  }
  await fulfillJson(ctx.route, buildCartPayload(cart.lines))
  return true
}

async function handleCartItemsPost(ctx: MockRouteContext, cart: CartState): Promise<boolean> {
  if (ctx.method !== 'POST' || ctx.path !== '/api/v1/cart/items') return false
  if (!authed(bearer(ctx.route))) {
    await fulfillJson(ctx.route, { message: 'Sign in.' }, 401)
    return true
  }
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(ctx.req.postData() ?? '{}') as Record<string, unknown>
  } catch {
    parsed = {}
  }
  const productId = Number(parsed.product_id)
  const qty = Number(parsed.quantity ?? 1)
  const product = productById(productId)
  if (!product) {
    await fulfillJson(ctx.route, { message: 'Unknown product.' }, 400)
    return true
  }
  let row = cart.lines.find((l) => l.product.id === productId)
  if (row) {
    row.qty += qty
  } else {
    row = { lineId: cart.nextLineId++, qty, product }
    cart.lines.push(row)
  }
  await fulfillJson(ctx.route, buildCartPayload(cart.lines))
  return true
}

async function handleCartLineDelete(ctx: MockRouteContext, cart: CartState): Promise<boolean> {
  if (ctx.method !== 'DELETE' || !/^\/api\/v1\/cart\/items\/\d+$/.test(ctx.path)) return false
  const lineId = Number(ctx.path.split('/').pop())
  cart.lines = cart.lines.filter((l) => l.lineId !== lineId)
  await ctx.route.fulfill({ status: 204 })
  return true
}

async function handleCheckout(ctx: MockRouteContext, cart: CartState): Promise<boolean> {
  if (ctx.method !== 'POST' || ctx.path !== '/api/v1/orders/checkout') return false
  if (!authed(bearer(ctx.route))) {
    await fulfillJson(ctx.route, { message: 'Sign in.' }, 401)
    return true
  }
  const snap = buildCartPayload(cart.lines)
  if (!snap.quantity_total) {
    await fulfillJson(ctx.route, { message: 'Cart empty.' }, 400)
    return true
  }
  const outLines = snap.lines.map((ln) => ({
    product_id: ln.product.id,
    sku: ln.product.sku,
    title: ln.product.title,
    quantity: ln.quantity,
    unit_price_cents: ln.product.price_cents,
    line_total_cents: ln.product.price_cents * ln.quantity,
  }))
  cart.lines.length = 0
  await fulfillJson(ctx.route, {
    id: 999,
    total_cents: snap.estimated_total_cents,
    status: 'PLACED',
    lines: outLines,
  })
  return true
}

async function dispatchMockRoute(ctx: MockRouteContext, opts: MockOptions, cart: CartState) {
  const chain: Array<(c: MockRouteContext, o: MockOptions, s: CartState) => Promise<boolean>> = [
    (c, o) => handleCatalogItemsList(c, o),
    (c) => handleCatalogItemDetail(c),
    (c) => handleAuthLogin(c),
    (c) => handleRegisterStart(c),
    (c) => handleRegisterProfile(c),
    (c) => handleRegisterShipping(c),
    (c) => handleRegisterComplete(c),
    (c) => handleAuthMe(c),
    (c) => handleAuthLogout(c),
    (c, _o, s) => handleCartGet(c, s),
    (c, _o, s) => handleCartItemsPost(c, s),
    (c, _o, s) => handleCartLineDelete(c, s),
    (c, _o, s) => handleCheckout(c, s),
  ]
  for (const step of chain) {
    if (await step(ctx, opts, cart)) return
  }
  await ctx.route.continue()
}

/** Deterministic mocks for SPA `fetch`; other requests fall through. */
export async function attachShopApiMocks(page: Page, opts: MockOptions = {}): Promise<void> {
  const cart: CartState = { nextLineId: 1, lines: [] }

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const ctx: MockRouteContext = {
      route,
      req,
      url,
      path: url.pathname.replace(/\/$/, ''),
      method: req.method(),
    }
    try {
      await dispatchMockRoute(ctx, opts, cart)
    } catch {
      await route.continue()
    }
  })
}
