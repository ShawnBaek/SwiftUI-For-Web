import { test, expect } from '@playwright/test';
import { DETERMINISTIC_INIT, waitForSwiftUIApp } from './fixtures/deterministic.js';

test.use({ viewport: { width: 1280, height: 800 } });

test('TestShowcase renders identically to baseline', async ({ page }) => {
  await page.addInitScript({ content: DETERMINISTIC_INIT });
  await page.goto('/Examples/TestShowcase/');
  await waitForSwiftUIApp(page);

  await expect(page).toHaveScreenshot('testshowcase.png', {
    maxDiffPixels: 0,
    threshold: 0,
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
  });
});
