import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { LoginPage } from './LoginPage'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import * as api from '../lib/api'

describe('LoginPage', () => {
  const stubUser = {
    id: 7,
    email: 'alice@test.dev',
    registration_complete: true,
    first_name: 'Alice',
    last_name: 'Example',
    phone: '+1',
    shipping_address: null,
  }

  it('successful login trims email and redirects to catalogue', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'authLogin').mockResolvedValue({ access_token: 'fresh' })
    vi.spyOn(api, 'authMe').mockResolvedValue(stubUser)

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/catalog" element={<h1>Catalog-Destination</h1>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), '  alice@test.dev  ')
    await user.type(screen.getByLabelText('Password'), 'hunter42')
    await user.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(api.authLogin).toHaveBeenCalledWith('alice@test.dev', 'hunter42')
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Catalog-Destination' })).toBeVisible()
    })
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
  })

  /** Negative UX: invalid credentials reuse API message */
  it('surfaces server error banner when login rejects', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'authLogin').mockRejectedValue(new Error('Invalid credentials'))

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/catalog" element={<h1>Catalog</h1>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'x@y.z')
    await user.type(screen.getByLabelText('Password'), 'no')
    await user.click(screen.getByRole('button', { name: /Continue/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid credentials/i)
    })
  })

  /** Edge: spinner replaces CTA mid-flight */
  it('renders Signing in placeholder while awaiting API', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'authLogin').mockImplementation(
      () => new Promise<{ access_token: string }>((resolve) => setTimeout(() => resolve({ access_token: 's' }), 60)),
    )
    vi.spyOn(api, 'authMe').mockResolvedValue(stubUser)

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/catalog" element={<h1>Ok</h1>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'alice@test.dev')
    await user.type(screen.getByLabelText('Password'), 'pw')
    await user.click(screen.getByRole('button', { name: /Continue/i }))

    expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled()
  })
})
