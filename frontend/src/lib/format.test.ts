import { describe, expect, it } from 'vitest'

import { formatUsd } from './format'

describe('formatUsd', () => {
  it('formats cents as USD', () => {
    expect(formatUsd(1299)).toBe('$12.99')
    expect(formatUsd(0)).toBe('$0.00')
  })

  it('shows two decimal places for small positive amounts', () => {
    expect(formatUsd(1)).toBe('$0.01')
    expect(formatUsd(9)).toBe('$0.09')
  })

  /** Edge: unusually large totals still formatted Tabular-ish */
  it('handles large integer cents without crashing', () => {
    expect(formatUsd(1_234_567_890)).toBe('$12,345,678.90')
  })

  /** Negative totals (credit / adjustment) propagate through Intl */
  it('formats negative cents with minus sign semantics', () => {
    expect(formatUsd(-499)).toBe('-$4.99')
  })
})

