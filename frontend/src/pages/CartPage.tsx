import { type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'
import { formatUsd } from '../lib/format'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function CartPage() {
  const { token } = useAuth()
  const { cart, refresh, loading } = useCart()
  const navigate = useNavigate()

  async function removeLine(lineId: number) {
    if (!token) return
    try {
      await api.removeCartLine(token, lineId)
      await refresh()
    } catch {
      await refresh()
    }
  }

  async function bumpQty(productId: number) {
    if (!token) return
    try {
      await api.addCartLine(token, { product_id: productId, quantity: 1 })
      await refresh()
    } catch {
      await refresh()
    }
  }

  function proceedCheckout(e: FormEvent) {
    e.preventDefault()
    navigate('/checkout')
  }

  if (!token) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your cart</h1>
          <p className="mt-1 text-sm text-slate-600">
            Quantities merge per product via <code className="text-xs">POST /cart/items</code>.
          </p>
        </div>
        <Link to="/catalog" className="text-sm font-medium text-indigo-600 hover:underline">
          Continue shopping
        </Link>
      </div>

      {loading && !cart ? (
        <p className="text-sm text-slate-500">Loading cart…</p>
      ) : !cart?.lines?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-600">
          <p>Your cart is empty.</p>
          <Link
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            to="/catalog"
          >
            Browse catalogue
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <ul className="space-y-3">
            {cart.lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{line.product.title}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    SKU {line.product.sku}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatUsd(line.product.price_cents)} ×{' '}
                    <span className="font-semibold tabular-nums">{line.quantity}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void bumpQty(line.product.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-slate-50"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeLine(line.id)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
            <p className="text-xs uppercase text-slate-500">Estimated total</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {formatUsd(cart.estimated_total_cents)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {cart.quantity_total} item{cart.quantity_total === 1 ? '' : 's'} across{' '}
              {cart.line_count}
              {' line'}
              {cart.line_count === 1 ? '' : 's'}
            </p>
            <form onSubmit={(e) => proceedCheckout(e)} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Checkout
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  )
}
