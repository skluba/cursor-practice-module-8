import { expect, test } from '@playwright/test'

import { CatalogPage } from '../pages/CatalogPage'

test.describe('Storefront smoke', () => {
  test('redirects root to catalogue and shows shell', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await page.goto('/')

    await expect(page).toHaveURL(/\/catalog$/)
    await expect(catalog.brandLink()).toBeVisible()
    await expect(catalog.catalogueHeading()).toBeVisible()
  })

  test('shows unauthenticated catalogue navigation affordances', async ({ page }) => {
    const catalog = new CatalogPage(page)
    await catalog.gotoCatalog()

    await expect(catalog.catalogueHeading()).toBeVisible()
    await expect(catalog.loginLink()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeVisible()
  })
})
