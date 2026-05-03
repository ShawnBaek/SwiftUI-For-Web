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

test('TodoApp visual baseline (multi-state)', async ({ page }) => {
  await page.addInitScript({ content: DETERMINISTIC_INIT });
  await page.goto('/Examples/TodoApp/');
  await waitForSwiftUIApp(page);

  await expect(page).toHaveScreenshot('todoapp-initial.png', SCREENSHOT_OPTS);

  // Add a new todo
  await page.locator('input[placeholder="What needs to be done?"]').fill('Write visual tests');
  await page.locator('button').filter({ hasText: /^Add$/ }).click();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  // Blur the input to remove focus ring (otherwise pixel diff)
  await page.locator('body').click({ position: { x: 0, y: 0 } });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page).toHaveScreenshot('todoapp-after-add.png', SCREENSHOT_OPTS);
});
