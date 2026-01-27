/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page } from '@playwright/test'

interface AuthFixtures {
  authenticatedPage: Page
  adminPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login as regular user
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await use(page)
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'adminpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await use(page)
  }
})

export { expect } from '@playwright/test'
