import { test, expect } from '@playwright/test';

test('tutorials page loads with screenshots', async ({ page }) => {
  await page.goto('/docs/');

  // Hero section
  await expect(page.locator('h1')).toContainText('SwiftUI for Web Tutorials');

  // Badges
  await expect(page.locator('.badge')).toHaveCount(4);

  // 6 example cards
  const cards = page.locator('.example-card');
  await expect(cards).toHaveCount(6);

  // All 6 screenshot images loaded
  const images = page.locator('.example-card img');
  await expect(images).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    const img = images.nth(i);
    await expect(img).toBeVisible();
    const naturalWidth = await img.evaluate(el => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  }

  // 6 detail sections
  const detailSections = page.locator('.detail-section');
  await expect(detailSections).toHaveCount(6);

  // Quick start section
  await expect(page.locator('#quickstart')).toBeVisible();
});

test('View Demo links point to correct examples', async ({ page }) => {
  await page.goto('/docs/');

  const expectedExamples = [
    'HelloWorld',
    'Counter',
    'TodoApp',
    'Netflix',
    'Airbnb',
    'Charts'
  ];

  const demoLinks = page.locator('.detail-section .btn-primary[href]');
  await expect(demoLinks).toHaveCount(6);

  for (let i = 0; i < expectedExamples.length; i++) {
    const href = await demoLinks.nth(i).getAttribute('href');
    expect(href).toContain(`/Examples/${expectedExamples[i]}/`);
  }
});

test('example demo pages load correctly', async ({ page }) => {
  const examples = ['HelloWorld', 'Counter', 'TodoApp', 'Netflix', 'Airbnb', 'Charts'];

  for (const name of examples) {
    const response = await page.goto(`/Examples/${name}/`);
    expect(response.status()).toBe(200);
    // Each example should have a #root div
    await expect(page.locator('#root')).toBeVisible();
  }
});
