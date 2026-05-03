// Smoke test: verifies the benchmark page loads without errors.
// Does NOT run the full benchmark (too slow); just imports modules.
import { test, expect } from '@playwright/test';

test('benchmark page loads modules without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    // Ignore harmless network 404s for favicon, etc.
    if (/favicon|404 \(File not found\)/.test(t)) return;
    errors.push(t);
  });

  await page.goto('/Tests/Benchmark/index.html');
  await page.waitForLoadState('networkidle');
  // The page should render the title and buttons.
  await expect(page.locator('h1')).toContainText('SwiftUI-For-Web');
  await expect(page.locator('#run-all')).toBeVisible();
  await expect(page.locator('#run-no-solid')).toBeVisible();

  if (errors.length) {
    throw new Error('Console errors on benchmark page:\n' + errors.join('\n'));
  }
});
