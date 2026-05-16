import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as api from './api'

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('token storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and retrieves access token via localStorage', () => {
    expect(api.getStoredToken()).toBeNull()
    api.setStoredToken('abc123')
    expect(api.getStoredToken()).toBe('abc123')
  })

  it('clears token when setStoredToken receives null', () => {
    api.setStoredToken('x')
    api.setStoredToken(null)
    expect(api.getStoredToken()).toBeNull()
  })

  /** Edge-ish: overwriting previous session token */
  it('replaces existing token without orphan keys', () => {
    api.setStoredToken('one')
    api.setStoredToken('two')
    expect(api.getStoredToken()).toBe('two')
  })
})

describe('fetchJson via public callers', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.local')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('logs in successfully and targets apiBase + bearer-free POST', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'jwt-1' }))
    const res = await api.authLogin(' alice@test.dev ', 'pwd')
    expect(res.access_token).toBe('jwt-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('http://test-api.local/api/v1/auth/login')
    expect(init.method).toBe('POST')
    expect(init.headers).toBeInstanceOf(Headers)
    expect(init.headers.has('Authorization')).toBe(false)
    const bodyObj = typeof init.body === 'string' ? JSON.parse(init.body) : {}
    expect(bodyObj.password).toBe('pwd')
  })

  /** Negative: server returns structured message */
  it('surfaces flask-smorest-style message JSON on HTTP error', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Invalid credentials.' }, 401))
    await expect(api.authLogin('a@b.c', 'w')).rejects.toThrow(/Invalid credentials/i)
  })

  /** Negative: array errors */
  it('joins marshmallow/array errors payloads', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: ['email missing', 'password short'] }, 422))
    await expect(api.authLogin('a', 'b')).rejects.toThrow(/email missing, password short/)
  })

  /** Negative: errors object stringify */
  it('stringifies structured errors objects when present', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: { email: ['invalid'] } }, 400))
    await expect(api.authLogin('a', 'b')).rejects.toThrow(/invalid/)
  })

  /** Edge: malformed JSON falls back to HTTP text */
  it('falls back to statusText when JSON body parsing fails', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(
      new Response('not-json', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(api.fetchCatalogPage(new URLSearchParams())).rejects.toThrow(/Bad Gateway|502/)
  })

  it('logout sends bearer token on POST and tolerates empty 204 bodies', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await api.authLogout('jwt')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers instanceof Headers ? init.headers.get('Authorization') : null).toBe('Bearer jwt')
    expect(init.method).toBe('POST')
  })

  /** Edge: Authorization header bearer on authenticated GET cart */
  it('checkout uses standalone fetch identical error parsing semantics', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Empty cart.' }, 400))
    await expect(api.checkout('tok')).rejects.toThrow(/Empty cart/)
  })
})

describe('removeCartLine', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.local')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('DELETE returns undefined on empty success', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(api.removeCartLine('t', 5)).resolves.toBeUndefined()
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('DELETE')
    expect(init.headers instanceof Headers ? init.headers.get('Authorization') : '').toContain('Bearer t')
  })
})
