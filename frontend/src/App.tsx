import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { PageLoadingFallback } from './components/PageLoadingFallback'
import { ProtectedRoute } from './components/ProtectedRoute'

const CataloguePage = lazy(() =>
  import('./pages/CataloguePage').then((m) => ({ default: m.CataloguePage })),
)
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
)
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })))
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)

export default function App() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/catalog" replace />} />
          <Route path="catalog" element={<CataloguePage />} />
          <Route path="catalog/:id" element={<ProductDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
