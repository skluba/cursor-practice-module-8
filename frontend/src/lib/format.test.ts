import { describe, expect, it } from 'vitest'

import { formatUsd } from './format'

describe('formatUsd', () => {
  it('formats cents as USD', () => {
    expect(formatUsd(1299)).toBe('$12.99')
    expect(formatUsd(0)).toBe('$0.00')
  })
})
