import { test, expect } from '../fixtures/auth'

test.describe('SSO Authentication', () => {
  test('should show SSO options on login page', async ({ page }) => {
    await page.goto('/login')

    // Check for SSO buttons if configured
    const ssoSection = page.locator('[data-testid="sso-options"]')
    if (await ssoSection.isVisible()) {
      await expect(ssoSection.getByRole('button')).toHaveCount(1)
    }
  })

  test('admin can access SSO provider configuration', async ({ adminPage }) => {
    await adminPage.goto('/admin')
    await adminPage.click('text=System')

    await expect(adminPage.getByText(/sso providers/i)).toBeVisible()
  })

  test('admin can add OIDC provider', async ({ adminPage }) => {
    await adminPage.goto('/admin')
    await adminPage.click('text=System')
    await adminPage.click('[data-testid="add-sso-provider"]')

    // Fill OIDC form
    await adminPage.click('[data-testid="provider-type-oidc"]')
    await adminPage.fill('[name="providerId"]', 'test-oidc')
    await adminPage.fill('[name="name"]', 'Test OIDC Provider')
    await adminPage.fill('[name="issuer"]', 'https://issuer.example.com')
    await adminPage.fill('[name="clientId"]', 'test-client-id')
    await adminPage.fill('[name="clientSecret"]', 'test-client-secret')

    await adminPage.click('button[type="submit"]')

    await expect(adminPage.getByText(/provider created/i)).toBeVisible()
  })

  test('non-admin cannot access SSO configuration', async ({
    authenticatedPage
  }) => {
    await authenticatedPage.goto('/admin')

    // Should not see System tab or be redirected
    const systemTab = authenticatedPage.getByText('System')
    await expect(systemTab).not.toBeVisible()
  })
})
