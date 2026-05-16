import { type FormEvent, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import * as api from '../lib/api'
import { validateEmail, validateRegisterPassword } from '../lib/validation'

import { useAuth } from '../context/AuthContext'

const STEP_LABELS = ['Account', 'Profile', 'Shipping', 'Complete']

export function RegisterPage() {
  const navigate = useNavigate()
  const { loginWithToken, token } = useAuth()
  const [step, setStep] = useState(1)

  const [wizToken, setWizToken] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')

  const [err, setErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [passwordErr, setPasswordErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (token && step === 1 && !wizToken) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-slate-700">You are already signed in.</p>
        <Link className="text-indigo-600 hover:underline" to="/catalog">
          Go to catalogue
        </Link>
      </div>
    )
  }

  async function step1Submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const ev = validateEmail(email)
    const pv = validateRegisterPassword(password)
    setEmailErr(ev)
    setPasswordErr(pv)
    if (ev || pv) return

    const normalizedEmail = email.trim().toLowerCase()
    setBusy(true)
    try {
      const tok = await api.authRegisterStart({ email: normalizedEmail, password })
      setWizToken(tok.access_token)
      setStep(2)
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not register')
    } finally {
      setBusy(false)
    }
  }

  async function step2Submit(e: FormEvent) {
    e.preventDefault()
    if (!wizToken) return
    setErr('')
    setBusy(true)
    try {
      await api.authRegisterProfile(wizToken, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      setStep(3)
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Profile failed')
    } finally {
      setBusy(false)
    }
  }

  async function step3Submit(e: FormEvent) {
    e.preventDefault()
    if (!wizToken) return
    setErr('')
    setBusy(true)
    try {
      await api.authRegisterShipping(wizToken, {
        street: street.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
      })
      setStep(4)
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Shipping failed')
    } finally {
      setBusy(false)
    }
  }

  async function step4Finish() {
    if (!wizToken) return
    setErr('')
    setBusy(true)
    try {
      const finalTok = await api.authRegisterComplete(wizToken)
      await loginWithToken(finalTok.access_token)
      navigate('/catalog', { replace: true })
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not complete')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Sign up · multi-step</h1>
        <p className="mt-2 text-sm text-slate-600">
          Credential → profile → shipping → activate (matches `/api/v1/auth/register/*`).
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-2 text-xs font-semibold uppercase tracking-wide">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            className={`flex-1 rounded-lg px-3 py-2 text-center ${i + 1 === step ? 'bg-white text-indigo-700 shadow' : 'text-slate-400'}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <form
          noValidate
          onSubmit={(e) => void step1Submit(e)}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}
          <label className="block text-sm font-medium text-slate-700">
            Email
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
              aria-describedby={emailErr ? 'register-email-feedback' : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${emailErr ? 'border-rose-400' : 'border-slate-300'}`}
            />
          </label>
          {emailErr ? (
            <p id="register-email-feedback" role="alert" className="-mt-2 text-sm text-rose-700">
              {emailErr}
            </p>
          ) : null}
          <label className="block text-sm font-medium text-slate-700">
            Password (≥ 8 chars)
            <input
              type="password"
              maxLength={256}
              value={password}
              onChange={(ev) => {
                setPassword(ev.target.value)
                setPasswordErr('')
              }}
              aria-invalid={Boolean(passwordErr)}
              aria-describedby={passwordErr ? 'register-password-feedback' : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 ${passwordErr ? 'border-rose-400' : 'border-slate-300'}`}
            />
          </label>
          {passwordErr ? (
            <p id="register-password-feedback" role="alert" className="-mt-2 text-sm text-rose-700">
              {passwordErr}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : 'Continue to profile'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => void step2Submit(e)}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              First name
              <input
                required
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Last name
              <input
                required
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Phone
            <input
              required
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              autoComplete="tel"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={(e) => void step3Submit(e)}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}
          <label className="block text-sm font-medium text-slate-700">
            Street
            <input
              required
              value={street}
              onChange={(ev) => setStreet(ev.target.value)}
              autoComplete="street-address"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              City
              <input
                required
                value={city}
                onChange={(ev) => setCity(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Postal code
              <input
                required
                value={postalCode}
                onChange={(ev) => setPostalCode(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Country code
            <input
              required
              placeholder="US"
              minLength={2}
              value={country}
              onChange={(ev) => setCountry(ev.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-[2] rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Review
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}
          <p className="text-sm text-slate-700">
            Final step activates <strong>{email.trim()}</strong> via{' '}
            <code className="text-xs">POST /register/complete</code>, then swaps in a standard session JWT.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void step4Finish()}
              className="flex-[2] rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy ? 'Completing…' : 'Activate account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
