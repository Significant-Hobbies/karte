import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1440]) {
  test(`guest creation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const trackingRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/track/'))
        trackingRequests.push(request.url());
    });
    // Local deterministic fixtures only: no importer/provider access.
    await page.route('**/api/onboarding/chat', (route) =>
      route.fulfill({
        status: 503,
        json: {
          error:
            'Onboarding bot is offline right now. Use the import or scratch flow below.',
        },
      }),
    );
    await page.route('**/api/import/preview', (route) =>
      route.fulfill({
        json: {
          links: [
            { title: 'Fixture project', url: 'https://example.test/project' },
          ],
        },
      }),
    );
    await page.goto('/create?slug=Fixture-Guest');
    await expect(page.getByLabel('Page URL')).toHaveValue('fixture-guest');
    await expect(
      page.getByRole('heading', { name: 'Build Your Profile' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Import & Preview' }),
    ).toBeHidden();
    await expect(page.getByPlaceholder('Say something…')).toBeHidden();
    expect(await page.locator('details[open]').count()).toBe(0);
    await page
      .getByLabel('Display Name', { exact: true })
      .fill('Local Fixture');
    await page.getByLabel('Bio', { exact: true }).fill('A local guest draft.');
    await expect(
      page.getByText('Local Fixture', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('karte.cc/fixture-guest', { exact: true }),
    ).toHaveCSS('color', 'rgb(196, 164, 107)');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `work/create-${width}.png`, fullPage: true });
    await page
      .getByText('Import links from an existing page', { exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Import & Preview' }),
    ).toBeVisible();
    await page
      .getByPlaceholder('https://linktr.ee/yourname')
      .fill('https://example.test/links');
    await page.getByRole('button', { name: 'Import & Preview' }).click();
    await expect(
      page.getByText('Fixture project', { exact: true }),
    ).toBeVisible();
    await page
      .getByText('Import links from an existing page', { exact: true })
      .click();
    await page
      .getByText('Get help drafting with chat', { exact: true })
      .click();
    await expect(page.getByPlaceholder('Say something…')).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Onboarding bot' }),
    ).toContainText('offline');
    await page
      .getByText('Get help drafting with chat', { exact: true })
      .click();
    expect(trackingRequests).toEqual([]);
    await page
      .getByRole('button', { name: 'Continue to Claim Username' })
      .click();
    await expect(page).toHaveURL(/\/login\?next=/);
    const draft = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('karte:page-draft') || '{}'),
    );
    expect(draft).toMatchObject({
      slug: 'fixture-guest',
      displayName: 'Local Fixture',
      bio: 'A local guest draft.',
      themePresetId: 'karte',
    });
  });
}
