import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ redirectPath = '/login' }: Readonly<{ redirectPath?: string }>) {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Signing you in…
      </div>
    )
  }

  if (token) {
    return <Outlet />
  }

  return <Navigate to={redirectPath} replace state={{ from: location.pathname }} />
}
