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
  type CartLineInner = {
    lineId: number
    qty: number
    product: typeof P1 | typeof P2
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
        const pageNum = Number(url.searchParams.get('page') ?? '1')
        const items = pageNum >= 2 ? [P2] : [P1, P2]
        await fulfillJson(route, {
          items,
          meta: {
            page: pageNum,
            page_size: 9,
            total: items.length,
            total_pages: Math.max(2, pageNum),
          },
        })
        return
      }

      if (method === 'GET' && /^\/api\/v1\/catalog\/items\/\d+$/.test(path)) {
        const id = Number(path.split('/').pop())
        const p = id === 1 ? P1 : id === 2 ? P2 : null
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
        const product = productId === 1 ? P1 : productId === 2 ? P2 : null
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
