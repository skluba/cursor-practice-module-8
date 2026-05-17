import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'

import { Layout } from './Layout'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  }
})

function renderShell(initialPath = '/catalog') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="catalog" element={<h1>Catalog body</h1>} />
              <Route path="login" element={<h1>Login body</h1>} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Layout mobile navigation', () => {
  it('opens drawer from burger and lists catalogue link inside mobile panel', async () => {
    const user = userEvent.setup()
    renderShell()

    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }))

    const drawer = screen.getByTestId('mobile-nav-drawer')
    expect(drawer).toBeVisible()
    expect(drawer).toHaveAttribute('aria-label', 'Mobile primary navigation')

    expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeVisible()

    const catalogueInDrawer = drawer.querySelectorAll('a[href="/catalog"]')
    expect(catalogueInDrawer.length).toBeGreaterThanOrEqual(1)
    expect(drawer.textContent).toMatch(/Catalogue/)
  })

  it('closes drawer when Escape is pressed', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }))
    expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument()
  })

  it('closes drawer when backdrop is clicked', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }))
    expect(screen.getByTestId('mobile-nav-backdrop')).toBeInTheDocument()

    await user.click(screen.getByTestId('mobile-nav-backdrop'))
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument()
  })

  it('burger toggle reflects aria-expanded while drawer is open', async () => {
    const user = userEvent.setup()
    renderShell()

    const openBtn = screen.getByRole('button', { name: /^Open navigation menu$/i })
    expect(openBtn).toHaveAttribute('aria-expanded', 'false')

    await user.click(openBtn)
    expect(screen.getByRole('button', { name: /^Close navigation menu$/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
