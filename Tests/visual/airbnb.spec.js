import { test, expect } from '@playwright/test';
import { DETERMINISTIC_INIT, waitForSwiftUIApp, blockExternalImages } from './fixtures/deterministic.js';

test.use({ viewport: { width: 1280, height: 800 } });

test('Airbnb renders identically to baseline', async ({ page }) => {
  await blockExternalImages(page);
  await page.addInitScript({ content: DETERMINISTIC_INIT });
  await page.goto('/Examples/Airbnb/');
  await waitForSwiftUIApp(page);

  // Airbnb mock API resolves async; wait for at least one image to appear in
  // the listing grid as a strong signal that data has rendered.
  await page.waitForFunction(
    () => document.querySelectorAll('img').length >= 4,
    null,
    { timeout: 15000 }
  );
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  await expect(page).toHaveScreenshot('airbnb.png', {
    maxDiffPixels: 0,
    threshold: 0,
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});
