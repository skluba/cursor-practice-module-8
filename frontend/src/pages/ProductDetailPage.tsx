import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import * as api from '../lib/api'
import { formatUsd } from '../lib/format'
import type { Product } from '../types/api'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { refresh } = useCart()
  const pid = Number(id)

  const [product, setProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    if (!Number.isFinite(pid) || pid < 1) {
      navigate('/catalog', { replace: true })
      return () => {}
    }
    ;(async () => {
      try {
        const p = await api.fetchProduct(pid)
        if (alive) setProduct(p)
      } catch {
        if (alive) navigate('/catalog', { replace: true })
      }
    })()
    return () => {
      alive = false
    }
  }, [pid, navigate])

  async function add(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (!token) {
      navigate('/login', { state: { from: `/catalog/${pid}` } })
      return
    }
    setBusy(true)
    try {
      await api.addCartLine(token, { product_id: pid, quantity: qty })
      await refresh()
      navigate('/cart')
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not add')
    } finally {
      setBusy(false)
    }
  }

  if (!product) {
    return (
      <p className="text-sm text-slate-500">
        Loading product… (<Link className="text-indigo-600" to="/catalog">back</Link>)
      </p>
    )
  }

  return (
    <article className="mx-auto max-w-lg space-y-6">
      <Link to="/catalog" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Catalogue
      </Link>
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{product.title}</h1>
        <p className="mt-2 text-xl font-semibold text-indigo-700">{formatUsd(product.price_cents)}</p>
        <p className="mt-4 text-sm text-slate-600">{product.description ?? 'No description.'}</p>
      </header>
      <form onSubmit={(e) => void add(e)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {err ? (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</div>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Quantity
          <input
            type="number"
            min={1}
            max={999}
            value={qty}
            onChange={(ev) => setQty(Number(ev.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Adding…' : token ? 'Add to cart' : 'Sign in to add'}
        </button>
      </form>
    </article>
  )
}
