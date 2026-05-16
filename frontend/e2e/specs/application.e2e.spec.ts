import { expect, test } from '@playwright/test'

import { CatalogPage } from '../pages/CatalogPage'
import { attachShopApiMocks } from '../helpers/shop-api-mocks'

test.describe('Storefront application (mocked API)', () => {
  test('redirects `/` → `/catalog`, shows catalogue shell', async ({ page }) => {
    await attachShopApiMocks(page)
    const catalog = new CatalogPage(page)
    await page.goto('/')

    await expect(page).toHaveURL(/\/catalog$/)
    await expect(catalog.brandLink()).toBeVisible()
    await expect(catalog.catalogueHeading()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'E2E Ceramic Mug' })).toBeVisible()
  })

  test('unauthenticated user sees catalogue + Login / Sign up affordances', async ({ page }) => {
    await attachShopApiMocks(page)
    const catalog = new CatalogPage(page)
    await catalog.gotoCatalog()

    await expect(catalog.catalogueHeading()).toBeVisible()
    await expect(catalog.loginLink()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible()
  })

  test('shows API error messaging when catalogue list fails', async ({ page }) => {
    await attachShopApiMocks(page, { catalogListError: true })
    await page.goto('/catalog')

    await expect(page.getByText(/Upstream inventory offline/i)).toBeVisible()
  })

  test('blocked routes send shoppers to `/login`', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  })

  test('login rejects invalid email with client-side message (no `/me`)', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/login')
    await page.getByLabel('Email').fill('missing-at-sign')
    await page.getByLabel('Password').fill('secret')
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('login failure surfaces server-provided toast', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/login')
    await page.getByLabel('Email').fill('fail@example.dev')
    await page.getByLabel('Password').fill('anything')
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(page.getByRole('alert')).toContainText(/Invalid credentials/i)
  })

  test('successful login restores session badge with `/me` email', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/login')
    await page.getByLabel('Email').fill('alice@example.dev')
    await page.getByLabel('Password').fill('secret')
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(page).toHaveURL(/\/catalog/)
    await expect(page.getByText(/shopper@test\.dev/).first()).toBeVisible()
  })

  test('anonymous product detail exposes sign-in helper CTA', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/catalog/1')
    await expect(page.getByRole('button', { name: /Sign in to add/i })).toBeVisible()
  })

  test('authenticated shopper can add SKU, checkout and see confirmation', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/login')
    await page.getByLabel('Email').fill('buyer@test.dev')
    await page.getByLabel('Password').fill('ok')
    await page.getByRole('button', { name: /Continue/i }).click()
    await expect(page).toHaveURL(/\/catalog/)

    await page.goto('/catalog/1')
    await page.getByLabel('Quantity').fill('2')
    await page.getByRole('button', { name: /Add to cart/i }).click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByText('Your cart')).toBeVisible()

    await page.getByRole('button', { name: /^Checkout$/i }).click()
    await expect(page).toHaveURL(/\/checkout/)

    await page.getByRole('button', { name: /Place order/i }).click()
    await expect(page.getByText(/Order #999 placed/i)).toBeVisible()
    await expect(page.getByText('Continue shopping')).toBeVisible()
  })

  test('signup rejects invalid email before advancing steps', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/register')
    await page.getByLabel('Email').fill('not-valid')
    await page.getByLabel(/Password \(≥/).fill('password12')
    await page.getByRole('button', { name: /Continue to profile/i }).click()

    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible()
    await expect(page.getByLabel(/^First name$/i)).not.toBeVisible()
  })

  test('signup blocks weak password before advancing steps', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/register')
    await page.getByLabel('Email').fill('wiz@test.dev')
    await page.getByLabel(/Password \(≥/).fill('short')
    await page.getByRole('button', { name: /Continue to profile/i }).click()

    await expect(page.getByText(/Use at least 8 characters/i)).toBeVisible()
    await expect(page.getByLabel(/^First name$/i)).not.toBeVisible()
  })

  test('multi-step signup advances through wizard scaffolding', async ({ page }) => {
    await attachShopApiMocks(page)
    await page.goto('/register')
    await page.getByLabel('Email').fill('wiz@test.dev')
    await page.getByLabel(/Password \(≥/).fill('password12')
    await page.getByRole('button', { name: /Continue to profile/i }).click()

    await expect(page.getByLabel(/^First name$/i)).toBeVisible()
    await page.getByLabel(/^First name$/i).fill('Pat')
    await page.getByLabel(/^Last name$/i).fill('Lee')
    await page.getByLabel(/^Phone$/i).fill('555-0100')
    await page.getByRole('button', { name: /^Continue$/ }).click()

    await expect(page.getByLabel(/^Street$/i)).toBeVisible()
  })
})
