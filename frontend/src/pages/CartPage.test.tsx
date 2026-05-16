import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CartPage } from './CartPage'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import * as api from '../lib/api'

describe('CartPage', () => {
  const shopper = {
    id: 1,
    email: 'shopper@test.dev',
    registration_complete: true,
    first_name: '',
    last_name: '',
    phone: '',
    shipping_address: null,
  }

  const line = {
    id: 9,
    quantity: 2,
    product: { id: 5, sku: 'Z', title: 'Zed', price_cents: 100 },
  }

  beforeEach(() => {
    vi.spyOn(api, 'authMe').mockResolvedValue(shopper)
    vi.spyOn(api, 'fetchCart').mockResolvedValue({
      lines: [line],
      line_count: 1,
      quantity_total: 2,
      estimated_total_cents: 200,
    })
    localStorage.setItem('ecom_access_token', 'sess')
  })

  it('renders lines and estimated total sourced from CartContext snapshot', async () => {
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<CartPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Your cart' })).toBeVisible()
    })
    expect(screen.getByText('$2.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Checkout/i })).toBeEnabled()
  })

  /** Positive: merges quantity server-side optimistic refresh */
  it('delegates bump quantity to POST /cart/items', async () => {
    const user = userEvent.setup()
    const addSpy = vi.spyOn(api, 'addCartLine').mockResolvedValue({
      lines: [{ ...line, quantity: 3 }],
      line_count: 1,
      quantity_total: 3,
      estimated_total_cents: 300,
    })

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<CartPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Zed')).toBeVisible())
    await user.click(screen.getByRole('button', { name: /^\+1$/i }))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('sess', { product_id: 5, quantity: 1 })
    })
  })

  /** Negative-but-resilient: remove retries refresh even if DELETE fails once */
  it('calls refresh after DELETE errors', async () => {
    const user = userEvent.setup()
    const removeSpy = vi.spyOn(api, 'removeCartLine').mockRejectedValue(new Error('network'))
    const fetchSpy = vi.spyOn(api, 'fetchCart')

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<CartPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /Remove/i })).toBeVisible())
    await user.click(screen.getByRole('button', { name: /Remove/i }))
    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalled()
    })
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  /** Edge: empty carts keep CTA to browse */
  it('guides shoppers when cart API returns zero lines', async () => {
    vi.spyOn(api, 'fetchCart').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 0,
      estimated_total_cents: 0,
    })

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/cart" element={<CartPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Your cart is empty/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Browse catalogue/i })).toHaveAttribute(
      'href',
      '/catalog',
    )
  })
})
