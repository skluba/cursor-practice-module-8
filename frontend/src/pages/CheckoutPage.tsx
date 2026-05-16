import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'
import { formatUsd } from '../lib/format'
import type { OrderResponse } from '../types/api'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function CheckoutPage() {
  const { token } = useAuth()
  const { refresh } = useCart()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function placeOrder() {
    if (!token) return
    setErr('')
    setBusy(true)
    try {
      const o = await api.checkout(token)
      setOrder(o)
      await refresh()
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return null
  }

  if (order) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          <h1 className="text-xl font-semibold">Order #{order.id} placed</h1>
          <p className="mt-1 text-sm">Status · {order.status}</p>
        </div>
        <dl className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm">
          <div className="flex justify-between tabular-nums">
            <dt className="text-slate-500">Grand total</dt>
            <dd className="font-semibold text-slate-900">{formatUsd(order.total_cents)}</dd>
          </div>
        </dl>
        <ul className="space-y-3 text-sm">
          {order.lines.map((ln, idx) => (
            <li
              key={`${ln.product_id}-${idx}`}
              className="flex justify-between rounded-lg border border-slate-100 px-3 py-2"
            >
              <span>
                <span className="font-medium text-slate-800">{ln.title}</span>{' '}
                <span className="text-slate-400">×{ln.quantity}</span>
              </span>
              <span className="tabular-nums">{formatUsd(ln.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <Link
            to="/catalog"
            className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Continue shopping
          </Link>
          <Link
            to="/cart"
            className="flex-1 rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500"
          >
            View cart (empty)
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Checkout</h1>
      <p className="text-sm text-slate-600">
        Calls <code className="text-xs">POST /orders/checkout</code> on the Flask API — stock is adjusted
        and your cart clears on success.
      </p>

      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          We use the shipping snapshot saved during registration — no duplicate address form needed for
          this simplified flow.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void placeOrder()}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? 'Placing…' : 'Place order'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/cart')}
          className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Back to cart
        </button>
      </div>
    </div>
  )
}
