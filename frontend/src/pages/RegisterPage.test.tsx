import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { RegisterPage } from './RegisterPage'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import * as api from '../lib/api'

describe('RegisterPage', () => {
  it('step 1 rejects API failures with inline alert', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'authRegisterStart').mockRejectedValue(new Error('Email unavailable'))

    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'taken@test.dev')
    await user.type(screen.getByLabelText(/Password \(≥/), 'password12')
    await user.click(screen.getByRole('button', { name: /Continue to profile/i }))

    await waitFor(() => {
      expect(screen.getByText(/Email unavailable/)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/First name/i)).not.toBeInTheDocument()
  })

  /** Positive multi-step handshake up to wizard completion */
  it('runs through wizard and exchanges completion token via loginWithToken', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'authRegisterStart').mockResolvedValue({ access_token: 'wiz' })
    vi.spyOn(api, 'authRegisterProfile').mockResolvedValue({
      id: 1,
      email: '',
      registration_complete: false,
      first_name: 'Jane',
      last_name: 'Doe',
      phone: '+1',
      shipping_address: null,
    })
    vi.spyOn(api, 'authRegisterShipping').mockResolvedValue({
      id: 1,
      email: '',
      registration_complete: false,
      first_name: '',
      last_name: '',
      phone: '',
      shipping_address: { street: '', city: '', postal_code: '', country: 'US' },
    })
    vi.spyOn(api, 'authRegisterComplete').mockResolvedValue({ access_token: 'final' })

    /** After completion AuthProvider validates /me with final bearer */
    vi.spyOn(api, 'authMe').mockResolvedValue({
      id: 9,
      email: 'wiz@test.dev',
      registration_complete: true,
      first_name: '',
      last_name: '',
      phone: '',
      shipping_address: null,
    })

    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/catalog" element={<main>REGISTERED_HERE</main>} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'wiz@test.dev')
    await user.type(screen.getByLabelText(/Password \(≥/), 'password12')
    await user.click(screen.getByRole('button', { name: /Continue to profile/i }))

    await waitFor(() => expect(screen.getByLabelText(/First name/i)).toBeVisible())

    await user.type(screen.getByLabelText(/First name/i), 'Jane')
    await user.type(screen.getByLabelText(/Last name/i), 'Doe')
    await user.type(screen.getByLabelText(/^Phone$/i), '5555555')
    await user.click(screen.getByRole('button', { name: /^Continue$/i }))

    await waitFor(() => expect(screen.getByLabelText(/^Street$/i)).toBeVisible())

    await user.type(screen.getByLabelText(/^Street$/i), '1 Main')
    await user.type(screen.getByLabelText(/^City$/i), 'Paris')
    await user.type(screen.getByLabelText(/Postal code/i), '75001')
    await user.type(screen.getByLabelText(/Country code/i), 'FR')
    await user.click(screen.getByRole('button', { name: /Review/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Activate account/i })).toBeVisible())
    await user.click(screen.getByRole('button', { name: /Activate account/i }))

    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveTextContent('REGISTERED_HERE')
    })
  })
})
