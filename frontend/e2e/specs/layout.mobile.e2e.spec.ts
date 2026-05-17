import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { attachShopApiMocks } from '../helpers/shop-api-mocks'

const primaryNav = (page: Page) => page.locator('header nav[aria-label="Primary"]')

const burgerToggle = (page: Page) =>
  page.locator('header button[aria-controls][aria-expanded]')

test.describe('Mobile layout (narrow viewport)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await attachShopApiMocks(page)
  })

  test('burger opens drawer with catalogue affordance', async ({ page }) => {
    await page.goto('/catalog')

    await expect(burgerToggle(page)).toBeVisible()
    await expect(primaryNav(page)).toBeHidden()

    await burgerToggle(page).click()
    await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible()
    await expect(page.getByRole('navigation', { name: /mobile primary/i })).toContainText(
      'Catalogue',
    )

    await burgerToggle(page).click()
    await expect(page.locator('[data-testid="mobile-nav-drawer"]')).toHaveCount(0)
  })
})

test.describe('Desktop layout (wide viewport)', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test.beforeEach(async ({ page }) => {
    await attachShopApiMocks(page)
  })

  test('horizontal primary nav visible and burger control hidden', async ({ page }) => {
    await page.goto('/catalog')

    await expect(primaryNav(page)).toBeVisible()
    await expect(burgerToggle(page)).toBeHidden()
  })
})
