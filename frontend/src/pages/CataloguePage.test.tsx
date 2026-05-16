import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { CataloguePage } from './CataloguePage'
import * as api from '../lib/api'

const itemA = {
  id: 1,
  sku: 'A',
  title: 'Alpha',
  description: null,
  price_cents: 1099,
  active: true,
}

const itemB = {
  id: 2,
  sku: 'B',
  title: 'Bravo',
  description: null,
  price_cents: 250,
  active: true,
}

describe('CataloguePage', () => {
  it('requests first page grid with formatted prices once loaded', async () => {
    const spy = vi.spyOn(api, 'fetchCatalogPage').mockResolvedValue({
      items: [itemA],
      meta: { page: 1, page_size: 9, total: 1, total_pages: 1 },
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading products…')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible()
    })
    expect(screen.getByText('$10.99')).toBeInTheDocument()
    expect(spy.mock.calls[0][0].get('page')).toBe('1')
  })

  /** Negative UX: flaky API surfaces human readable toast */
  it('shows error panel when catalogue fetch rejects', async () => {
    vi.spyOn(api, 'fetchCatalogPage').mockRejectedValue(new Error('Gateway timeout'))

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Gateway timeout/)).toBeInTheDocument()
    })
    expect(screen.queryByText('Previous page')).not.toBeInTheDocument()
  })

  /** Positive empty catalogue */
  it('shows empty catalogue copy instead of grids', async () => {
    vi.spyOn(api, 'fetchCatalogPage').mockResolvedValue({
      items: [],
      meta: { page: 1, page_size: 9, total: 0, total_pages: 0 },
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('No products available.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  /** Edge: paging next uses meta guards */
  it('fires second fetch when paging forward with multi-page meta', async () => {
    const user = userEvent.setup()
    const spy = vi
      .spyOn(api, 'fetchCatalogPage')
      .mockResolvedValueOnce({
        items: [itemA],
        meta: { page: 1, page_size: 9, total: 2, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        items: [itemB],
        meta: { page: 2, page_size: 9, total: 2, total_pages: 2 },
      })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())
    await user.click(screen.getByRole('button', { name: /Next page/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bravo' })).toBeVisible()
    })

    /** StrictMode / double effects can prepend extra page-1 probes */
    await waitFor(() => {
      const last = spy.mock.calls.at(-1)?.[0]
      expect(last?.get('page')).toBe('2')
    })

    /** Previous locked on page 2 now enabled */
    expect(screen.getByRole('button', { name: /Previous page/i })).toBeEnabled()
  })
})
