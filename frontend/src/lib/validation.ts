/**
 * Client-side rules aligned with backend Marshmallow schemas (see backend/app/schemas/api.py).
 * Returns empty string when valid, otherwise a short user-facing message.
 */

const LOGIN_PASSWORD_MAX = 256
const REGISTER_PASSWORD_MAX = 256
const EMAIL_MAX_CHARS = 320

/** Require at least one dot in the host (matches typical production addresses). */

function hasDangerousAsciiWhitespace(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) <= 32) return true
  }
  return false
}

/**
 * Linear-time, dot-in-host heuristic (similar to prior regex semantics).
 * No nested quantifiers (avoids catastrophic backtracking on hostile input).
 */
function isReasonableAsciiEmail(value: string): boolean {
  const atIdx = value.indexOf('@')
  if (atIdx <= 0) return false
  if (value.indexOf('@', atIdx + 1) !== -1) return false
  const local = value.slice(0, atIdx)
  const host = value.slice(atIdx + 1)
  if (!local.length || !host.length) return false
  if (!host.includes('.')) return false
  if (host.startsWith('.') || host.endsWith('.') || host.includes('..')) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false

  const labels = host.split('.')
  if (labels.length < 2) return false
  for (const label of labels) {
    if (!label.length) return false
  }
  return true
}

export function validateEmail(trimmedLowerOrRaw: string): string {
  const v = trimmedLowerOrRaw.trim()
  if (!v) return 'Enter your email address.'
  if (v.length > EMAIL_MAX_CHARS) return `Email must be ${EMAIL_MAX_CHARS} characters or fewer.`
  if (hasDangerousAsciiWhitespace(v) || !isReasonableAsciiEmail(v)) {
    return 'Enter a valid email address.'
  }
  return ''
}

export function validateLoginPassword(password: string): string {
  if (!password || password.trim().length < 1) return 'Enter your password.'
  if (password.length > LOGIN_PASSWORD_MAX) return `Password must be ${LOGIN_PASSWORD_MAX} characters or fewer.`
  return ''
}

export function validateRegisterPassword(password: string): string {
  if (!password) return 'Enter a password.'
  if (password.length < 8) return 'Use at least 8 characters.'
  if (password.length > REGISTER_PASSWORD_MAX) return `Password must be ${REGISTER_PASSWORD_MAX} characters or fewer.`
  return ''
}
