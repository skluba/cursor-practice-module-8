import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import * as api from '../lib/api'
import type { UserPublic } from '../types/api'

interface AuthState {
  token: string | null
  user: UserPublic | null
  loading: boolean
}

interface AuthActions {
  loginWithToken: (accessToken: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null)

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [token, setToken] = useState<string | null>(() => api.getStoredToken())
  const [user, setUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState<boolean>(() => Boolean(api.getStoredToken()))

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const me = await api.authMe(token)
        if (!cancelled) {
          setUser(me)
        }
      } catch {
        api.setStoredToken(null)
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const loginWithToken = useCallback(async (accessToken: string) => {
    api.setStoredToken(accessToken)
    setToken(accessToken)
  }, [])

  const logout = useCallback(async () => {
    const t = token
    try {
      if (t) {
        await api.authLogout(t)
      }
    } catch {
      /* still clear client session */
    }
    api.setStoredToken(null)
    setToken(null)
    setUser(null)
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      loginWithToken,
      logout,
    }),
    [token, user, loading, loginWithToken, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState & AuthActions {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
