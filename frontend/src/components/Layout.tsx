import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-100 text-indigo-800' : 'text-slate-700 hover:bg-slate-100'
  }`

export function Layout() {
  const { user, logout, loading, token } = useAuth()
  const { cart } = useCart()
  const badge =
    cart && typeof cart.quantity_total === 'number' && cart.quantity_total > 0
      ? cart.quantity_total
      : null

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/catalog" className="text-lg font-semibold tracking-tight text-indigo-700">
            Shop<span className="text-slate-800">Mart</span>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink className={navClass} to="/catalog" end={false}>
              Catalogue
            </NavLink>
            {token ? (
              <NavLink className={navClass} to="/cart">
                Cart
                {badge !== null ? (
                  <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            ) : (
              <span className="rounded-lg px-3 py-2 text-sm text-slate-400" title="Sign in">
                Cart
              </span>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <>
                <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 sm:inline">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Log out
                </button>
              </>
            ) : !loading ? (
              <>
                <NavLink className={navClass} to="/login">
                  Log in
                </NavLink>
                <NavLink
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  to="/register"
                >
                  Sign up
                </NavLink>
              </>
            ) : (
              <span className="text-sm text-slate-400">…</span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        Demo store · API{' '}
        <code className="rounded bg-slate-100 px-1">{import.meta.env.VITE_API_BASE_URL ?? 'localhost:5000'}</code>
      </footer>
    </div>
  )
}
