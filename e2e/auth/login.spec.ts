import { test, expect } from '../fixtures/auth'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/')
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  })

  test('should logout successfully', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="user-menu"]')
    await authenticatedPage.click('[data-testid="logout"]')

    await authenticatedPage.waitForURL('/login')
    await expect(
      authenticatedPage.getByRole('heading', { name: /sign in/i })
    ).toBeVisible()
  })

  test('should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('/login?redirect=/admin')
  })
})
