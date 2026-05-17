import { describe, expect, it } from 'vitest'

import { validateEmail, validateLoginPassword, validateRegisterPassword } from './validation'

describe('validateEmail', () => {
  it('rejects empty and whitespace-only', () => {
    expect(validateEmail('')).toMatch(/Enter your email/)
    expect(validateEmail('   ')).toMatch(/Enter your email/)
  })

  it('rejects malformed addresses', () => {
    expect(validateEmail('not-an-email')).toMatch(/valid email/)
    expect(validateEmail('@nodomain')).toMatch(/valid email/)
    expect(validateEmail('a@')).toMatch(/valid email/)
    expect(validateEmail('a@@bad.com')).toMatch(/valid email/)
  })

  it('accepts typical addresses after trim', () => {
    expect(validateEmail('  user@example.com  ')).toBe('')
    expect(validateEmail('user+tag@sub.example.dev')).toBe('')
  })

  it('errors when absurdly long', () => {
    const local = 'a'.repeat(316)
    const msg = validateEmail(`${local}@x.co`)
    expect(msg.length).toBeGreaterThan(0)
    expect(msg).toMatch(/320/)
  })
})

describe('validateLoginPassword', () => {
  it('rejects missing', () => {
    expect(validateLoginPassword('')).toMatch(/password/i)
    expect(validateLoginPassword('   ')).toMatch(/password/i)
  })

  it('accepts minimal valid token', () => {
    expect(validateLoginPassword('x')).toBe('')
  })

  it('respects backend max length', () => {
    expect(validateLoginPassword('a'.repeat(256))).toBe('')
    expect(validateLoginPassword('b'.repeat(257))).toMatch(/256/)
  })
})

describe('validateRegisterPassword', () => {
  it('rejects missing and short', () => {
    expect(validateRegisterPassword('')).toMatch(/password/i)
    expect(validateRegisterPassword('1234567')).toMatch(/8/)
  })

  it('accepts exactly eight characters', () => {
    expect(validateRegisterPassword('abcdefgh')).toBe('')
  })

  it('respects backend max length', () => {
    expect(validateRegisterPassword('x'.repeat(256))).toBe('')
    expect(validateRegisterPassword('y'.repeat(257))).toMatch(/256/)
  })
})
