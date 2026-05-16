import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CartPage } from './pages/CartPage'
import { CataloguePage } from './pages/CataloguePage'
import { CheckoutPage } from './pages/CheckoutPage'
import { LoginPage } from './pages/LoginPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { RegisterPage } from './pages/RegisterPage'

export default function App() {
  return (
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
  )
}
