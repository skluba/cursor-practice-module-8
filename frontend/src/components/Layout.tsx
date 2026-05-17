import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import type { UserPublic } from '../types/api'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-100 text-indigo-800' : 'text-slate-700 hover:bg-slate-100'
  }`

const navClassMobile =
  'block rounded-lg px-3 py-3 text-base font-medium text-slate-800 hover:bg-slate-100 aria-[current=page]:bg-indigo-100 aria-[current=page]:text-indigo-800'

function BadgePill({ value }: { value: number }) {
  return (
    <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {value}
    </span>
  )
}

function DesktopCartLinks({
  token,
  badge,
}: Readonly<{ token: string | null; badge: number | null }>) {
  if (token) {
    const pill = typeof badge === 'number' ? <BadgePill value={badge} /> : null
    return (
      <NavLink className={navClass} to="/cart">
        Cart
        {pill}
      </NavLink>
    )
  }
  return (
    <span className="rounded-lg px-3 py-2 text-sm text-slate-400" title="Sign in">
      Cart
    </span>
  )
}

function DesktopAccountCluster({
  loading,
  user,
  onLogout,
}: Readonly<{ loading: boolean; user: UserPublic | null; onLogout: () => void }>) {
  if (loading) {
    return <span className="text-sm text-slate-400">…</span>
  }
  if (user) {
    return (
      <>
        <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 lg:inline">
          {user.email}
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      </>
    )
  }
  return (
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
  )
}

function BurgerGlyphs({ menuOpen }: { menuOpen: boolean }) {
  if (menuOpen) {
    return (
      <span className="text-xl leading-none" aria-hidden>
        ×
      </span>
    )
  }
  return (
    <span className="flex flex-col gap-1.5 py-1" aria-hidden>
      <span className="block h-0.5 w-6 rounded-full bg-slate-700" />
      <span className="block h-0.5 w-6 rounded-full bg-slate-700" />
      <span className="block h-0.5 w-6 rounded-full bg-slate-700" />
    </span>
  )
}

function MobileNavBackdrop({
  headerHeightPx,
  onDismiss,
}: Readonly<{ headerHeightPx: number; onDismiss: () => void }>) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-40 bg-slate-900/45 md:hidden"
      style={{ top: headerHeightPx }}
      data-testid="mobile-nav-backdrop"
      aria-label="Dismiss navigation drawer"
      onClick={onDismiss}
    />
  )
}

function MobileDrawerCartArea({
  token,
  badge,
  closeMobileNav,
}: Readonly<{
  token: string | null
  badge: number | null
  closeMobileNav: () => void
}>) {
  if (token) {
    const pill = typeof badge === 'number' ? <BadgePill value={badge} /> : null
    return (
      <NavLink className={navClassMobile} to="/cart" onClick={closeMobileNav}>
        <span className="inline-flex items-center gap-2">
          Cart
          {pill}
        </span>
      </NavLink>
    )
  }
  return (
    <span className="rounded-lg px-3 py-3 text-base text-slate-400" title="Sign in">
      Cart (sign in required)
    </span>
  )
}

function MobileDrawerPanel({
  mobileNavId,
  headerHeightPx,
  token,
  badge,
  loading,
  user,
  closeMobileNav,
  handleLogoutMobile,
}: Readonly<{
  mobileNavId: string
  headerHeightPx: number
  token: string | null
  badge: number | null
  loading: boolean
  user: UserPublic | null
  closeMobileNav: () => void
  handleLogoutMobile: () => void
}>) {
  return (
    <nav
      id={mobileNavId}
      data-testid="mobile-nav-drawer"
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 z-[45] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden"
      style={{
        top: headerHeightPx,
        maxHeight: `min(72vh, calc(100dvh - ${headerHeightPx}px))`,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1">
        <NavLink className={navClassMobile} to="/catalog" end={false} onClick={closeMobileNav}>
          Catalogue
        </NavLink>
        <MobileDrawerCartArea token={token} badge={badge} closeMobileNav={closeMobileNav} />

        <div className="my-2 border-t border-slate-100" />

        <MobileDrawerAccountBlock
          loading={loading}
          user={user}
          closeMobileNav={closeMobileNav}
          onLogoutMobile={handleLogoutMobile}
        />
      </div>
    </nav>
  )
}

function MobileDrawerAccountBlock({
  loading,
  user,
  closeMobileNav,
  onLogoutMobile,
}: Readonly<{
  loading: boolean
  user: UserPublic | null
  closeMobileNav: () => void
  onLogoutMobile: () => void
}>) {
  if (loading) {
    return <span className="px-3 py-2 text-sm text-slate-400">Signing you in…</span>
  }
  if (user) {
    return (
      <>
        <span className="truncate px-3 py-1 text-xs uppercase tracking-wide text-slate-500">
          Signed in as
        </span>
        <span className="truncate px-3 pb-2 text-sm text-slate-700">{user.email}</span>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-3 text-left text-base font-medium text-slate-800 hover:bg-slate-50"
          onClick={onLogoutMobile}
        >
          Log out
        </button>
      </>
    )
  }
  return (
    <>
      <NavLink className={navClassMobile} to="/login" onClick={closeMobileNav}>
        Log in
      </NavLink>
      <NavLink
        className="mt-1 rounded-lg bg-indigo-600 px-3 py-3 text-center text-base font-semibold text-white hover:bg-indigo-500"
        to="/register"
        onClick={closeMobileNav}
      >
        Sign up
      </NavLink>
    </>
  )
}

export function Layout() {
  const { user, logout, loading, token } = useAuth()
  const { cart } = useCart()
  const badge =
    cart && typeof cart.quantity_total === 'number' && cart.quantity_total > 0
      ? cart.quantity_total
      : null

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const headerMeasureRef = useRef<HTMLDivElement>(null)
  const [headerHeightPx, setHeaderHeightPx] = useState(56)

  const mobileNavId = useId()

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  const handleDesktopLogout = useCallback(() => {
    logout().catch(() => undefined)
  }, [logout])

  const handleLogoutMobile = useCallback(() => {
    closeMobileNav()
    logout().catch(() => undefined)
  }, [closeMobileNav, logout])

  useLayoutEffect(() => {
    const el = headerMeasureRef.current
    if (!el) return

    const sync = () => setHeaderHeightPx(el.offsetHeight)

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMobileNav()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileNavOpen, closeMobileNav])

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div
          ref={headerMeasureRef}
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3"
        >
          <NavLink
            to="/catalog"
            className="shrink-0 text-lg font-semibold tracking-tight text-indigo-700"
            onClick={closeMobileNav}
          >
            Shop<span className="text-slate-800">Mart</span>
          </NavLink>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLink className={navClass} to="/catalog" end={false}>
              Catalogue
            </NavLink>
            <DesktopCartLinks token={token} badge={badge} />
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <DesktopAccountCluster loading={loading} user={user} onLogout={handleDesktopLogout} />
          </div>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls={mobileNavId}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <BurgerGlyphs menuOpen={mobileNavOpen} />
          </button>
        </div>

        {mobileNavOpen ? (
          <>
            <MobileNavBackdrop headerHeightPx={headerHeightPx} onDismiss={closeMobileNav} />
            <MobileDrawerPanel
              mobileNavId={mobileNavId}
              headerHeightPx={headerHeightPx}
              token={token}
              badge={badge}
              loading={loading}
              user={user}
              closeMobileNav={closeMobileNav}
              handleLogoutMobile={handleLogoutMobile}
            />
          </>
        ) : null}
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
