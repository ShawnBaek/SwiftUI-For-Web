import { test, expect } from '@playwright/test';
import { DETERMINISTIC_INIT, waitForSwiftUIApp } from './fixtures/deterministic.js';

test.use({ viewport: { width: 1280, height: 800 } });

const SCREENSHOT_OPTS = {
  maxDiffPixels: 0,
  threshold: 0,
  animations: 'disabled',
  caret: 'hide',
  fullPage: true,
};

test('Counter visual baseline (multi-state)', async ({ page }) => {
  await page.addInitScript({ content: DETERMINISTIC_INIT });
  await page.goto('/Examples/Counter/');
  await waitForSwiftUIApp(page);

  await expect(page).toHaveScreenshot('counter-initial.png', SCREENSHOT_OPTS);

  await page.locator('button').filter({ hasText: /^\+$/ }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page).toHaveScreenshot('counter-after-plus.png', SCREENSHOT_OPTS);

  await page.locator('button').filter({ hasText: /^−$/ }).click();
  await page.locator('button').filter({ hasText: /^−$/ }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page).toHaveScreenshot('counter-after-minus.png', SCREENSHOT_OPTS);

  await page.locator('button').filter({ hasText: /^Reset$/ }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page).toHaveScreenshot('counter-after-reset.png', SCREENSHOT_OPTS);
});
