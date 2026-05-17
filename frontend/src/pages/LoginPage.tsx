import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'
import { validateEmail, validateLoginPassword } from '../lib/validation'

import { useAuth } from '../context/AuthContext'

type LoginLocationState = { from?: string }

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedFrom = location.state as LoginLocationState | null | undefined
  const from = redirectedFrom?.from ?? '/catalog'

  const { loginWithToken, token, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [passwordErr, setPasswordErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const ev = validateEmail(email)
    const pv = validateLoginPassword(password)
    setEmailErr(ev)
    setPasswordErr(pv)
    if (ev || pv) return

    const normalizedEmail = email.trim().toLowerCase()
    setBusy(true)
    try {
      const tok = await api.authLogin(normalizedEmail, password)
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
        noValidate
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          submit(e).catch(() => undefined)
        }}
      >
        {err ? (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Email{' '}
          <input
            autoComplete="email"
            type="email"
            maxLength={320}
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value)
              setEmailErr('')
            }}
            aria-invalid={Boolean(emailErr)}
            aria-describedby={emailErr ? 'login-email-feedback' : undefined}
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${emailErr ? 'border-rose-400' : 'border-slate-300'}`}
          />
        </label>
        {emailErr ? (
          <p id="login-email-feedback" role="alert" className="-mt-2 text-sm text-rose-700">
            {emailErr}
          </p>
        ) : null}
        <label className="block text-sm font-medium text-slate-700">
          Password{' '}
          <input
            autoComplete="current-password"
            type="password"
            maxLength={256}
            value={password}
            onChange={(ev) => {
              setPassword(ev.target.value)
              setPasswordErr('')
            }}
            aria-invalid={Boolean(passwordErr)}
            aria-describedby={passwordErr ? 'login-password-feedback' : undefined}
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${passwordErr ? 'border-rose-400' : 'border-slate-300'}`}
          />
        </label>
        {passwordErr ? (
          <p id="login-password-feedback" role="alert" className="-mt-2 text-sm text-rose-700">
            {passwordErr}
          </p>
        ) : null}
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
