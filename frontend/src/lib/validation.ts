/**
 * Client-side rules aligned with backend Marshmallow schemas (see backend/app/schemas/api.py).
 * Returns empty string when valid, otherwise a short user-facing message.
 */

const LOGIN_PASSWORD_MAX = 256
const REGISTER_PASSWORD_MAX = 256
const EMAIL_MAX_CHARS = 320

/** Require at least one dot in the host (matches typical production addresses). */
const EMAIL_PATTERN = /^[^\s@]+@(?:[^\s@]+\.)+[^\s@]+$/

export function validateEmail(trimmedLowerOrRaw: string): string {
  const v = trimmedLowerOrRaw.trim()
  if (!v) return 'Enter your email address.'
  if (v.length > EMAIL_MAX_CHARS) return `Email must be ${EMAIL_MAX_CHARS} characters or fewer.`
  if (!EMAIL_PATTERN.test(v)) return 'Enter a valid email address.'
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
