import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'

import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = ((location.state as { from?: string } | undefined)?.from as string | undefined) ?? '/catalog'

  const { loginWithToken, token, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const tok = await api.authLogin(email.trim(), password)
      await loginWithToken(tok.access_token)
      navigate(from || '/catalog', { replace: true })
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  if (!loading && token) {
    return <Navigate to="/catalog" replace />
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
      <p className="text-sm text-slate-600">
        No account yet?{' '}
        <Link className="font-medium text-indigo-600 hover:underline" to="/register">
          Sign up for free
        </Link>
      </p>
      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => void submit(e)}
      >
        {err ? (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="email"
            required
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            autoComplete="current-password"
            required
            minLength={1}
            type="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
