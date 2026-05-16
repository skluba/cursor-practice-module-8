import type { Locator, Page } from '@playwright/test'

/** Catalogue + shell (POM: stable selectors live here, not scattered in specs). */
export class CatalogPage {
  constructor(private readonly page: Page) {}

  brandLink(): Locator {
    return this.page.getByRole('link', { name: 'ShopMart', exact: true })
  }

  catalogueHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Product catalogue', exact: true })
  }

  loginLink(): Locator {
    return this.page.getByRole('link', { name: 'Log in', exact: true })
  }

  async gotoCatalog(): Promise<void> {
    await this.page.goto('/catalog')
  }
}
