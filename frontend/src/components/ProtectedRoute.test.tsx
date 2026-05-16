import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { ProtectedRoute } from './ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import * as api from '../lib/api'

describe('ProtectedRoute', () => {
  const baseUser = {
    id: 1,
    email: 'sam@sample.dev',
    registration_complete: true,
    first_name: 'Sam',
    last_name: 'Ple',
    phone: '555',
    shipping_address: null,
  }

  it('shows loading spinner while validating stored token via /me', async () => {
    localStorage.setItem('ecom_access_token', 'pending-session')
    vi.spyOn(api, 'authMe').mockImplementationOnce(() => new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="cart" element={<div data-testid="cart-content">inside</div>} />
              </Route>
              <Route path="login" element={<p>Redirected-login</p>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Signing you in…')).toBeInTheDocument()
    expect(screen.queryByTestId('cart-content')).not.toBeInTheDocument()
    await Promise.resolve()
  })

  /** Negative UX: anon must not fetch protected cart screen */
  it('redirects anonymous users to login with outbound state', async () => {
    localStorage.clear()
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="checkout" element={<div data-testid="protected">checkout</div>} />
              </Route>
              <Route path="login" element={<main>Login-shell</main>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveTextContent('Login-shell')
    })
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument()
  })

  /** Positive: valid session exposes nested route */
  it('renders child route once token + /me resolves', async () => {
    localStorage.setItem('ecom_access_token', 'good-session')
    vi.spyOn(api, 'authMe').mockResolvedValue(baseUser)

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="cart" element={<div data-testid="inside-cart">Protected cart UI</div>} />
              </Route>
              <Route path="login" element={<p>login</p>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('inside-cart')).toBeVisible()
    })
    expect(screen.queryByText('Signing you in…')).not.toBeInTheDocument()
  })

  /** Edge: backend rejects revoked token → client clears cookie session */
  it('eventually treats invalid /me as logged out once loading finishes', async () => {
    localStorage.setItem('ecom_access_token', 'dead-session')
    vi.spyOn(api, 'authMe').mockRejectedValue(new Error('revoked'))

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="checkout" element={<div>Never</div>} />
              </Route>
              <Route path="login" element={<aside>please-log-in</aside>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('please-log-in')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(localStorage.getItem('ecom_access_token')).toBeNull()
    })
  })
})
