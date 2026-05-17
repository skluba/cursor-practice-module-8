import type { Page, Route } from '@playwright/test'

export const LOGIN_TOKEN = 'e2e-access-token'

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

const MOCK_CATALOG_INDEXED = MOCK_CATALOG.map((row) =>
  row.id === 5 ? ZEN_OVERRIDE : row.id === 6 ? LOW_OVERRIDE : row.id === 7 ? AERO_OVERRIDE : row,
)

function productById(pid: number) {
  return MOCK_CATALOG_INDEXED.find((p) => p.id === pid) ?? null
}

const ALLOWED_SORT = new Set(['id', 'title_asc', 'title_desc', 'price_asc', 'price_desc'])

function normalizeCatalogRows(
  url: URL,
): { body: Record<string, unknown>; status?: number } {
  const sort = url.searchParams.get('sort') ?? 'id'
  if (!ALLOWED_SORT.has(sort)) {
    return { status: 422, body: { message: 'Invalid sort.', errors: { sort: ['Invalid choice.'] } } }
  }

  let rows = MOCK_CATALOG_INDEXED.map((r) => ({ ...r }))
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length) {
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    )
  }

  const minPc = url.searchParams.get('min_price_cents')
  const maxPc = url.searchParams.get('max_price_cents')
  let loNum: number | null = null
  let hiNum: number | null = null
  if (minPc !== null && minPc !== '') {
    loNum = Number(minPc)
    if (Number.isNaN(loNum)) {
      return { status: 422, body: { message: 'Bad min_price_cents.' } }
    }
  }
  if (maxPc !== null && maxPc !== '') {
    hiNum = Number(maxPc)
    if (Number.isNaN(hiNum)) {
      return { status: 422, body: { message: 'Bad max_price_cents.' } }
    }
  }
  if (loNum !== null && hiNum !== null && loNum > hiNum) {
    return {
      status: 422,
      body: { message: 'min_price_cents cannot exceed max_price_cents.' },
    }
  }
  if (loNum !== null) {
    rows = rows.filter((r) => r.price_cents >= loNum)
  }
  if (hiNum !== null) {
    rows = rows.filter((r) => r.price_cents <= hiNum)
  }

  rows.sort((a, b) => {
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
  })

  const pageNumRaw = Number(url.searchParams.get('page') ?? '1')
  const pageNum = Number.isFinite(pageNumRaw) && pageNumRaw >= 1 ? pageNumRaw : 1
  const psRaw = Number(url.searchParams.get('page_size') ?? '20')
  const pageSize =
    Number.isFinite(psRaw) && psRaw >= 1 ? Math.min(100, Math.floor(psRaw)) : 20
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
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
    headers:
      status === 204
        ? undefined
        : {
            'Content-Type': 'application/json',
          },
  })
}

/** Deterministic mocks for SPA `fetch`; other requests fall through. */
export async function attachShopApiMocks(page: Page, opts: MockOptions = {}): Promise<void> {
  type CatalogRow = (typeof MOCK_CATALOG_INDEXED)[number]

  type CartLineInner = {
    lineId: number
    qty: number
    product: CatalogRow
  }

  let nextLineId = 1
  let cartLines: CartLineInner[] = []

  function bearer(req: Route): string {
    const h = req.request().headers()['authorization'] ?? ''
    return h.replace(/^Bearer\s+/i, '').trim()
  }

  function authed(tok: string): boolean {
    return tok === LOGIN_TOKEN
  }

  function cartPayload(): {
    lines: Array<{ id: number; quantity: number; product: { id: number; sku: string; title: string; price_cents: number } }>
    line_count: number
    quantity_total: number
    estimated_total_cents: number
  } {
    const lines = cartLines.map((ln) => ({
      id: ln.lineId,
      quantity: ln.qty,
      product: {
        id: ln.product.id,
        sku: ln.product.sku,
        title: ln.product.title,
        price_cents: ln.product.price_cents,
      },
    }))
    const quantity_total = cartLines.reduce((sum, ln) => sum + ln.qty, 0)
    const estimated_total_cents = cartLines.reduce(
      (sum, ln) => sum + ln.product.price_cents * ln.qty,
      0,
    )
    return {
      lines,
      line_count: lines.length,
      quantity_total,
      estimated_total_cents,
    }
  }

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace(/\/$/, '')
    const method = req.method()

    try {
      if (method === 'GET' && path === '/api/v1/catalog/items') {
        if (opts.catalogListError) {
          await fulfillJson(route, { message: 'Upstream inventory offline.' }, 502)
          return
        }
        const payload = normalizeCatalogRows(url)
        const st = payload.status ?? 200
        await fulfillJson(route, payload.body, st)
        return
      }

      if (method === 'GET' && /^\/api\/v1\/catalog\/items\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop())
        const p = productById(id)
        if (!p) {
          await fulfillJson(route, { message: 'Not found.' }, 404)
          return
        }
        await fulfillJson(route, p)
        return
      }

      if (method === 'POST' && path === '/api/v1/auth/login') {
        const raw = req.postData() ?? ''
        if (raw.includes('fail@')) {
          await fulfillJson(route, { message: 'Invalid credentials.' }, 401)
          return
        }
        await fulfillJson(route, { access_token: LOGIN_TOKEN })
        return
      }

      if (method === 'POST' && path === '/api/v1/auth/register/start') {
        await fulfillJson(route, { access_token: 'wiz-start' })
        return
      }
      if (method === 'POST' && path.endsWith('/auth/register/profile')) {
        await fulfillJson(route, SAMPLE_USER_ME)
        return
      }
      if (method === 'POST' && path.endsWith('/auth/register/shipping')) {
        await fulfillJson(route, SAMPLE_USER_ME)
        return
      }
      if (method === 'POST' && path.endsWith('/auth/register/complete')) {
        await fulfillJson(route, { access_token: LOGIN_TOKEN })
        return
      }

      if (method === 'GET' && path === '/api/v1/auth/me') {
        if (!authed(bearer(route))) {
          await fulfillJson(route, { message: 'Unauthorized.' }, 401)
          return
        }
        await fulfillJson(route, SAMPLE_USER_ME)
        return
      }

      if (method === 'POST' && path === '/api/v1/auth/logout') {
        await route.fulfill({ status: 204 })
        return
      }

      if (method === 'GET' && path === '/api/v1/cart') {
        if (!authed(bearer(route))) {
          await fulfillJson(route, { message: 'Sign in.' }, 401)
          return
        }
        await fulfillJson(route, cartPayload())
        return
      }

      if (method === 'POST' && path === '/api/v1/cart/items') {
        if (!authed(bearer(route))) {
          await fulfillJson(route, { message: 'Sign in.' }, 401)
          return
        }
        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(req.postData() ?? '{}') as Record<string, unknown>
        } catch {
          parsed = {}
        }
        const productId = Number(parsed.product_id)
        const qty = Number(parsed.quantity ?? 1)
        const product = productById(productId)
        if (!product) {
          await fulfillJson(route, { message: 'Unknown product.' }, 400)
          return
        }
        let row = cartLines.find((l) => l.product.id === productId)
        if (row) {
          row.qty += qty
        } else {
          row = { lineId: nextLineId++, qty, product }
          cartLines.push(row)
        }
        await fulfillJson(route, cartPayload())
        return
      }

      if (method === 'DELETE' && /^\/api\/v1\/cart\/items\/\d+$/.test(path)) {
        const lineId = Number(path.split('/').pop())
        cartLines = cartLines.filter((l) => l.lineId !== lineId)
        await route.fulfill({ status: 204 })
        return
      }

      if (method === 'POST' && path === '/api/v1/orders/checkout') {
        if (!authed(bearer(route))) {
          await fulfillJson(route, { message: 'Sign in.' }, 401)
          return
        }
        const snap = cartPayload()
        if (!snap.quantity_total) {
          await fulfillJson(route, { message: 'Cart empty.' }, 400)
          return
        }
        const outLines = snap.lines.map((ln) => ({
          product_id: ln.product.id,
          sku: ln.product.sku,
          title: ln.product.title,
          quantity: ln.quantity,
          unit_price_cents: ln.product.price_cents,
          line_total_cents: ln.product.price_cents * ln.quantity,
        }))
        const total = snap.estimated_total_cents
        cartLines = []
        await fulfillJson(route, {
          id: 999,
          total_cents: total,
          status: 'PLACED',
          lines: outLines,
        })
        return
      }

      await route.continue()
    } catch {
      await route.continue()
    }
  })
}
