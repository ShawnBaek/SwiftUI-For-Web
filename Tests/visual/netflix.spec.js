import { test, expect } from '@playwright/test';
import { DETERMINISTIC_INIT, waitForSwiftUIApp, blockExternalImages } from './fixtures/deterministic.js';

test.use({ viewport: { width: 1280, height: 800 } });

test('Netflix renders identically to baseline', async ({ page }) => {
  await blockExternalImages(page);
  await page.addInitScript({ content: DETERMINISTIC_INIT });
  await page.goto('/Examples/Netflix/');
  await waitForSwiftUIApp(page);

  // Wait for any loading overlay to disappear
  await page.waitForFunction(
    () => !document.querySelector('.netflix-loading-overlay'),
    null,
    { timeout: 5000 }
  ).catch(() => {});

  // Settle a few rAFs after overlay teardown
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  await expect(page).toHaveScreenshot('netflix.png', {
    maxDiffPixels: 0,
    threshold: 0,
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});
