/** API payloads aligned with the Flask marshmallow/OpenAPI schemas. */

export interface TokenResponse {
  access_token: string
}

export interface UserPublic {
  id: number
  email: string
  registration_complete: boolean
  first_name: string | null
  last_name: string | null
  phone: string | null
  shipping_address: Record<string, unknown> | null
}

export interface Product {
  id: number
  sku: string
  title: string
  description: string | null
  price_cents: number
  active: boolean
}

export interface CatalogMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface CatalogResponse {
  items: Product[]
  meta: CatalogMeta
}

export interface CartProductMini {
  id: number
  sku: string
  title: string
  price_cents: number
}

export interface CartLine {
  id: number
  quantity: number
  product: CartProductMini
}

export interface CartResponse {
  lines: CartLine[]
  line_count: number
  quantity_total: number
  estimated_total_cents: number
}

export interface OrderLineExpose {
  product_id: number
  sku: string
  title: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

export interface OrderResponse {
  id: number
  total_cents: number
  status: string
  lines: OrderLineExpose[]
}
