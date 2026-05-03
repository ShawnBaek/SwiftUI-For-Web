import { test, expect } from '@playwright/test';
import { DETERMINISTIC_INIT, waitForSwiftUIApp } from './fixtures/deterministic.js';

test.use({ viewport: { width: 1280, height: 800 } });

test('Charts renders identically to baseline', async ({ page }) => {
  await page.addInitScript({ content: DETERMINISTIC_INIT });
  await page.goto('/Examples/Charts/');
  // Wait for at least one rendered chart shape
  await waitForSwiftUIApp(page, { extraSelector: 'svg rect, svg path, svg circle', expectedCount: 1 });
  await expect(page).toHaveScreenshot('charts.png', {
    maxDiffPixels: 0,
    threshold: 0,
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});
