import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderResponse } from '../types/api'

import { CheckoutPage } from './CheckoutPage'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import * as api from '../lib/api'

describe('CheckoutPage', () => {
  const shopper = {
    id: 1,
    email: 'o@test.dev',
    registration_complete: true,
    first_name: '',
    last_name: '',
    phone: '',
    shipping_address: null,
  }

  beforeEach(() => {
    localStorage.setItem('ecom_access_token', 'pay')
    vi.spyOn(api, 'authMe').mockResolvedValue(shopper)
    vi.spyOn(api, 'fetchCart').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 0,
      estimated_total_cents: 0,
    })
    vi.spyOn(api, 'addCartLine').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 0,
      estimated_total_cents: 0,
    })
    vi.spyOn(api, 'removeCartLine').mockResolvedValue(undefined)
  })

  it('finalizes checkout and exposes order summary totals', async () => {
    const user = userEvent.setup()
    const refreshSpy = vi.spyOn(api, 'fetchCart')
    vi.spyOn(api, 'checkout').mockResolvedValue({
      id: 77,
      total_cents: 1234,
      status: 'PAID',
      lines: [
        {
          product_id: 10,
          sku: 'P',
          title: 'Poster',
          quantity: 1,
          unit_price_cents: 1234,
          line_total_cents: 1234,
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /Place order/i }))

    await waitFor(() => {
      expect(screen.getByText(/Order #77 placed/i)).toBeVisible()
    })
    /** Grand total mirrors line_total when single SKU */
    expect(screen.getAllByText('$12.34')).toHaveLength(2)
    expect(refreshSpy.mock.calls.length).toBeGreaterThan(0)
  })

  /** Negative: payment rejects */
  it('surfaces descriptive failure copy when checkout rejects', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'checkout').mockRejectedValue(new Error('Out of stock'))

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /Place order/i }))
    await waitFor(() => {
      expect(screen.getByText(/Out of stock/i)).toBeVisible()
    })
  })

  /** Edge: disables double submission while awaiting network */
  it('keeps checkout CTA disabled while placing', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'checkout').mockImplementation(
      () =>
        new Promise<OrderResponse>(() => {
          /* intentionally unresolved for assertion window */
        }),
    )

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /Place order/i }))
    expect(screen.getByRole('button', { name: /Placing/i })).toBeDisabled()
  })
})
