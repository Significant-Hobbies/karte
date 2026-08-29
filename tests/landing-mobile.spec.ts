import { expect, test } from '@playwright/test';

/**
 * Mobile-viewport smoke test for the public landing page.
 *
 * Runs under both the `desktop` and `mobile` Playwright projects (see
 * playwright.config.ts). The `mobile` project uses a 390px iPhone 13
 * viewport — the fleet mobile target — so layout regressions there fail CI.
 *
 * The signed-in dashboard requires Google OAuth, so the primary signed-in
 * flow is verified manually against the mobile conventions doc.
 */
test.describe('landing page', () => {
  test('renders the public inbound desk with no horizontal scroll', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: /A public card that answers back/i,
        level: 1,
      }),
    ).toBeVisible();

    await expect(
      page.getByText(/creators and independent operators/i),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Create your page/i }).first(),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test('the shipped capability and company boundaries are present', async ({
    page,
  }) => {
    await page.goto('/');

    await page
      .getByText(/What ships today/i)
      .first()
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('heading', { name: /One profile. Several useful doors/i }),
    ).toBeVisible();
    await expect(
      page
        .locator('.capability-ledger')
        .locator('dt', { hasText: 'Contact and inbox' }),
    ).toBeVisible();
    await expect(
      page
        .locator('.capability-ledger')
        .locator('dt', { hasText: 'Owner dashboard' }),
    ).toBeVisible();

    await page.locator('.boundary-section').scrollIntoViewIfNeeded();
    await expect(
      page.getByRole('heading', {
        name: /The foundation fits a company introduction/i,
      }),
    ).toBeVisible();
  });

  test('the primary CTA is a large enough touch target', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /Create your page/i }).first();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});
