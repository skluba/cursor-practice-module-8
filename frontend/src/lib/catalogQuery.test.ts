import { describe, expect, it } from 'vitest'

import {
  buildCatalogListParams,
  parseMoneyUsdForCatalogFilter,
} from './catalogQuery'

describe('buildCatalogListParams', () => {
  it('includes pagination defaults and omit empty filter fields', () => {
    const p = buildCatalogListParams({ page: 2, pageSize: 9, sort: 'id' })
    expect(Object.fromEntries(p)).toMatchObject({
      page: '2',
      page_size: '9',
      sort: 'id',
    })
    expect(p.has('q')).toBe(false)
    expect(p.has('min_price_cents')).toBe(false)
    expect(p.has('max_price_cents')).toBe(false)
  })

  it('includes sort and trimmed q when set', () => {
    const p = buildCatalogListParams({
      page: 1,
      pageSize: 12,
      sort: 'title_desc',
      q: '  mugs  ',
    })
    expect(p.get('sort')).toBe('title_desc')
    expect(p.get('q')).toBe('mugs')
  })

  it('includes cents band when finite non-negative numbers', () => {
    const p = buildCatalogListParams({
      page: 1,
      pageSize: 20,
      minPriceCents: 499,
      maxPriceCents: 250099,
    })
    expect(p.get('min_price_cents')).toBe('499')
    expect(p.get('max_price_cents')).toBe('250099')
  })

  it('omits malformed cents sentinel NaN paths', () => {
    const p = buildCatalogListParams({
      page: 1,
      pageSize: 9,
      minPriceCents: Number.NaN,
      maxPriceCents: -3,
    })
    expect(p.has('min_price_cents')).toBe(false)
    expect(p.has('max_price_cents')).toBe(false)
  })

  it('clips q to backend max length (200 chars)', () => {
    const long = `x${'a'.repeat(250)}`
    const p = buildCatalogListParams({ page: 1, pageSize: 9, q: long })
    expect(p.get('q')!.length).toBe(200)
  })
})

describe('parseMoneyUsdForCatalogFilter', () => {
  it('treats blank as omit', () => {
    expect(parseMoneyUsdForCatalogFilter('  ')).toEqual({ ok: true, cents: null })
  })

  it('parses decimals to cents', () => {
    expect(parseMoneyUsdForCatalogFilter('12.99')).toEqual({ ok: true, cents: 1299 })
  })

  it('negative UX: rejects junk', () => {
    expect(parseMoneyUsdForCatalogFilter('oops')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseMoneyUsdForCatalogFilter('-1')).toEqual({ ok: false, reason: 'invalid' })
  })
})
