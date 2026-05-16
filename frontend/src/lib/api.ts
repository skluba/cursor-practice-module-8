import type {
  CartResponse,
  CatalogResponse,
  OrderResponse,
  Product,
  TokenResponse,
  UserPublic,
} from '../types/api'

const TOKEN_STORAGE_KEY = 'ecom_access_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string | null): void {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000'
}

async function parseErrorMessage(response: Response): Promise<string> {
  const ct = response.headers.get('Content-Type') ?? ''
  if (ct.includes('application/json')) {
    try {
      const body: Record<string, unknown> = await response.json()
      if (typeof body.message === 'string') {
        return body.message
      }
      if (Array.isArray(body.errors)) {
        return body.errors.map((e: unknown) => String(e)).join(', ')
      }
      if (body.errors && typeof body.errors === 'object') {
        return JSON.stringify(body.errors)
      }
    } catch {
      /* fall through */
    }
  }
  return response.statusText || `HTTP ${response.status}`
}

async function fetchJson<T>(
  path: string,
  opts: RequestInit & { token?: string | null; allowEmpty?: boolean } = {},
): Promise<T | undefined> {
  const { token, allowEmpty, ...init } = opts
  const headers = new Headers(init.headers)
  if (
    init.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${apiBase()}${path}`, { ...init, headers })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }
  if (allowEmpty || res.status === 204) {
    return undefined
  }
  return (await res.json()) as T
}

/** --- Auth --- */

export async function authRegisterStart(payload: {
  email: string
  password: string
}): Promise<TokenResponse> {
  return (await fetchJson<TokenResponse>('/api/v1/auth/register/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as TokenResponse
}

export async function authRegisterProfile(
  token: string,
  payload: { first_name: string; last_name: string; phone: string },
): Promise<UserPublic> {
  return (await fetchJson<UserPublic>('/api/v1/auth/register/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })) as UserPublic
}

export async function authRegisterShipping(
  token: string,
  payload: {
    street: string
    city: string
    postal_code: string
    country: string
  },
): Promise<UserPublic> {
  return (await fetchJson<UserPublic>('/api/v1/auth/register/shipping', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })) as UserPublic
}

export async function authRegisterComplete(token: string): Promise<TokenResponse> {
  return (await fetchJson<TokenResponse>('/api/v1/auth/register/complete', {
    method: 'POST',
    token,
    body: '{}',
  })) as TokenResponse
}

export async function authLogin(email: string, password: string): Promise<TokenResponse> {
  return (await fetchJson<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })) as TokenResponse
}

export async function authLogout(token: string): Promise<void> {
  await fetchJson('/api/v1/auth/logout', { method: 'POST', token, allowEmpty: true })
}

export async function authMe(token: string): Promise<UserPublic> {
  return (await fetchJson<UserPublic>('/api/v1/auth/me', { token })) as UserPublic
}

/** --- Catalog --- */

export async function fetchCatalogPage(search: URLSearchParams): Promise<CatalogResponse> {
  return (await fetchJson<CatalogResponse>(
    `/api/v1/catalog/items?${search.toString()}`,
    {},
  )) as CatalogResponse
}

export async function fetchProduct(productId: number): Promise<Product> {
  return (await fetchJson<Product>(
    `/api/v1/catalog/items/${productId}`,
    {},
  )) as Product
}

/** --- Cart --- */

export async function fetchCart(token: string): Promise<CartResponse> {
  return (await fetchJson<CartResponse>('/api/v1/cart', { token })) as CartResponse
}

export async function addCartLine(
  token: string,
  payload: { product_id: number; quantity: number },
): Promise<CartResponse> {
  return (await fetchJson<CartResponse>('/api/v1/cart/items', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  })) as CartResponse
}

export async function removeCartLine(token: string, lineId: number): Promise<void> {
  await fetchJson(`/api/v1/cart/items/${lineId}`, {
    method: 'DELETE',
    token,
    allowEmpty: true,
  })
}

/** --- Orders --- */

export async function checkout(token: string): Promise<OrderResponse> {
  const res = await fetch(`${apiBase()}/api/v1/orders/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }
  return (await res.json()) as OrderResponse
}
