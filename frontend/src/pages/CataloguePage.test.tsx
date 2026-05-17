import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { CataloguePage } from './CataloguePage'
import * as api from '../lib/api'

function stub(id: number, title: string, price_cents: number) {
  return {
    id,
    sku: `SKU-${id}`,
    title,
    description: null,
    price_cents,
    active: true,
  }
}

const itemA = stub(1, 'Alpha', 1099)
const PAGE1_IDS = [
  stub(1, 'Alpha', 1099),
  ...Array.from({ length: 8 }, (_, i) => stub(i + 2, `Filler row ${i + 2}`, 500 + i * 10)),
]
const PAGE2_ITEMS = [
  stub(10, 'Filler row 10', 599),
  stub(11, 'Filler row 11', 609),
  stub(12, 'Filler row 12', 619),
]

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

    expect(screen.getByRole('status', { name: /Loading catalogue products/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible()
    })
    expect(screen.getByText('$10.99')).toBeInTheDocument()
    expect(spy.mock.calls[0][0].get('page')).toBe('1')
    expect(spy.mock.calls[0][0].get('sort')).toBe('id')
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
      meta: { page: 1, page_size: 9, total: 0, total_pages: 1 },
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
        items: PAGE1_IDS,
        meta: { page: 1, page_size: 9, total: 12, total_pages: 2 },
      })
      .mockResolvedValueOnce({
        items: PAGE2_ITEMS,
        meta: { page: 2, page_size: 9, total: 12, total_pages: 2 },
      })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())
    await user.click(screen.getByRole('button', { name: /Next page/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Filler row 10' })).toBeVisible()
    })

    await waitFor(() => {
      const last = spy.mock.calls.at(-1)?.[0]
      expect(last?.get('page')).toBe('2')
    })

    expect(screen.getByRole('button', { name: /Previous page/i })).toBeEnabled()
  })

  /** Sort change hits API with encoded sort enum */
  it('loads price ascending order when shopper changes sort', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(api, 'fetchCatalogPage').mockResolvedValue({
      items: [itemA],
      meta: { page: 1, page_size: 9, total: 1, total_pages: 1 },
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())
    spy.mockClear()
    await user.selectOptions(screen.getByLabelText(/Sort catalogue/i), 'price_asc')

    await waitFor(() => {
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1)
      expect(spy.mock.calls.at(-1)?.[0].get('sort')).toBe('price_asc')
    })
  })

  /** Apply filters submits search plus optional price band converted to cents */
  it('sends trimmed search and USD-derived cents filters on Apply', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(api, 'fetchCatalogPage').mockResolvedValue({
      items: [itemA],
      meta: { page: 1, page_size: 9, total: 1, total_pages: 1 },
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())
    spy.mockClear()

    await user.clear(screen.getByLabelText(/Filter by keywords/i))
    await user.type(screen.getByLabelText(/Filter by keywords/i), '  mug ')
    await user.type(screen.getByLabelText(/Minimum price USD/i), '3')
    await user.type(screen.getByLabelText(/Maximum price USD/i), '20')
    await user.click(screen.getByRole('button', { name: /Apply filters/i }))

    await waitFor(() => {
      const p = spy.mock.calls.at(-1)?.[0]
      expect(p?.get('q')).toBe('mug')
      expect(p?.get('min_price_cents')).toBe('300')
      expect(p?.get('max_price_cents')).toBe('2000')
      expect(p?.get('page')).toBe('1')
    })
  })

  /** Negative: junk USD blocks network */
  it('shows toolbar alert when shopper types non-numeric price filter', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(api, 'fetchCatalogPage').mockResolvedValue({
      items: [itemA],
      meta: { page: 1, page_size: 9, total: 1, total_pages: 1 },
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())

    spy.mockClear()
    await user.clear(screen.getByLabelText(/Maximum price USD/i))
    await user.type(screen.getByLabelText(/Maximum price USD/i), 'nope')
    await user.click(screen.getByRole('button', { name: /Apply filters/i }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').some((el) => /12 or 12\.99/i.test(el.textContent ?? '')))
        .toBe(true)
    })
    expect(spy).not.toHaveBeenCalled()
  })

  /** Corner: min/max flip caught client-side before fetch */
  it('shows toolbar validation when minimum USD exceeds maximum', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'fetchCatalogPage').mockResolvedValue({
      items: [itemA],
      meta: { page: 1, page_size: 9, total: 1, total_pages: 1 },
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())
    await user.clear(screen.getByLabelText(/Minimum price USD/i))
    await user.type(screen.getByLabelText(/Minimum price USD/i), '40')
    await user.clear(screen.getByLabelText(/Maximum price USD/i))
    await user.type(screen.getByLabelText(/Maximum price USD/i), '1')
    await user.click(screen.getByRole('button', { name: /Apply filters/i }))

    await waitFor(() => {
      expect(screen.getByText(/Minimum price cannot exceed maximum price/i)).toBeInTheDocument()
    })
  })

  /** Negative API mid-session clears after follow-up fetch */
  it('shows catalogue error banner when refetch rejects then hides after recovery', async () => {
    const user = userEvent.setup()
    let failingPriceDesc = true
    const spy = vi.spyOn(api, 'fetchCatalogPage').mockImplementation((params: URLSearchParams) => {
      const sort = params.get('sort') ?? 'id'
      if (sort === 'price_desc' && failingPriceDesc) {
        failingPriceDesc = false
        return Promise.reject(new Error('Service temporarily overloaded.'))
      }
      return Promise.resolve({
        items: [itemA],
        meta: { page: 1, page_size: 9, total: 1, total_pages: 1 },
      })
    })

    render(
      <MemoryRouter>
        <CataloguePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible())
    spy.mockClear()
    await user.selectOptions(screen.getByLabelText(/Sort catalogue/i), 'price_desc')

    await waitFor(() =>
      expect(screen.getByText(/Service temporarily overloaded/i)).toBeInTheDocument(),
    )

    spy.mockClear()
    await user.selectOptions(screen.getByLabelText(/Sort catalogue/i), 'id')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible()
      expect(screen.queryByText(/Service temporarily overloaded/i)).not.toBeInTheDocument()
    })
    expect(spy.mock.calls.some((call) => call[0].get('sort') === 'id')).toBe(true)
  })
})
