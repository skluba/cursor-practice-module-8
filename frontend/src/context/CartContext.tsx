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
import type { CartResponse } from '../types/api'

import { useAuth } from './AuthContext'

interface CartCtx {
  cart: CartResponse | null
  loading: boolean
  refresh: () => Promise<void>
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [cart, setCart] = useState<CartResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!token) {
      setCart(null)
      return
    }
    setLoading(true)
    try {
      setCart(await api.fetchCart(token))
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ cart, loading, refresh }), [cart, loading, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartCtx {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider')
  }
  return ctx
}
