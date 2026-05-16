import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { ProductDetailPage } from './ProductDetailPage'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import * as api from '../lib/api'

describe('ProductDetailPage', () => {
  const product = {
    id: 42,
    sku: 'SKU-42',
    title: 'Stainless Kettle',
    description: 'Electric',
    price_cents: 8900,
    active: true,
  }

  it('loads SKU copy and merges quantity into cart CTAs after auth succeeds', async () => {
    const user = userEvent.setup()
    localStorage.setItem('ecom_access_token', 'jwt')
    vi.spyOn(api, 'authMe').mockResolvedValue({
      id: 1,
      email: 'd@z',
      registration_complete: true,
      first_name: 'x',
      last_name: 'y',
      phone: '1',
      shipping_address: null,
    })
    vi.spyOn(api, 'fetchProduct').mockResolvedValue(product)
    const addSpy = vi.spyOn(api, 'addCartLine').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 2,
      estimated_total_cents: 8900,
    })
    vi.spyOn(api, 'fetchCart').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 0,
      estimated_total_cents: 0,
    })

    render(
      <MemoryRouter initialEntries={['/catalog/42']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/catalog/:id" element={<ProductDetailPage />} />
              <Route path="/catalog" element={<h1>CATALOG_FALLBACK</h1>} />
              <Route path="/cart" element={<h1>CART_STUB</h1>} />
              <Route path="/login" element={<h1>LOGIN_STUB</h1>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: product.title })).toBeVisible()
    })
    expect(screen.getByText(/\$89\.00/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Quantity'))
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.click(screen.getByRole('button', { name: /Add to cart/i }))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('jwt', { product_id: 42, quantity: 2 })
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'CART_STUB' })).toBeVisible()
    })
  })

  /** Negative / edge: anon must authenticate before merging lines */
  it('routes anonymous shoppers to login with return path preserved', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    vi.spyOn(api, 'fetchProduct').mockResolvedValue(product)
    /** cart fetch still resolved as empty for nav badge churn */
    vi.spyOn(api, 'fetchCart').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 0,
      estimated_total_cents: 0,
    })

    render(
      <MemoryRouter initialEntries={['/catalog/42']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/catalog/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<p>LOGIN_FOR_RETURN</p>} />
              <Route path="/cart" element={<h1>nope</h1>} />
              <Route path="/catalog" element={<p>fallback</p>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: product.title })).toBeVisible())
    await user.click(screen.getByRole('button', { name: /Sign in to add/i }))

    await waitFor(() => {
      expect(screen.getByText('LOGIN_FOR_RETURN')).toBeInTheDocument()
    })
  })

  it('navigates back to catalogue when detail fetch rejects', async () => {
    localStorage.clear()
    vi.spyOn(api, 'fetchProduct').mockRejectedValue(new Error('missing'))
    vi.spyOn(api, 'fetchCart').mockResolvedValue({
      lines: [],
      line_count: 0,
      quantity_total: 0,
      estimated_total_cents: 0,
    })

    render(
      <MemoryRouter initialEntries={['/catalog/42']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/catalog/:id" element={<ProductDetailPage />} />
              <Route path="/catalog" element={<article>Returned-to-catalog-list</article>} />
              <Route path="/login" element={<p>?</p>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Returned-to-catalog-list/i)).toBeInTheDocument()
    })
  })
})
