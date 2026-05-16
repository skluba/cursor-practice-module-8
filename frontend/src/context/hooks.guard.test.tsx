import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

describe('provider hooks guards', () => {
  /** Negative: stray hook misuse */
  it('useAuth surfaces descriptive error outside AuthProvider', () => {
    expect(() =>
      renderHook(() => useAuth()),
    ).toThrow(/useAuth must be used inside AuthProvider/i)
  })

  it('useCart surfaces descriptive error outside CartProvider', () => {
    expect(() =>
      renderHook(() => useCart()),
    ).toThrow(/useCart must be used inside CartProvider/i)
  })
})
