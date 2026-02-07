// @ts-check
import { test, expect } from '@playwright/test';

/**
 * TodoApp Filter Tests
 * Verifies that completing todos and filtering by status works correctly
 */
test.describe('TodoApp Filter', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/Examples/TodoApp/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });
  });

  test('should show sample todos on load', async ({ page }) => {
    // Sample data: "Learn SwiftUI for Web", "Build a todo app" (completed), "Share with the community"
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Build a todo app")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Share with the community")').first()).toBeVisible();
  });

  test('should filter to show only completed todos', async ({ page }) => {
    // Click "Completed" filter button (exact match to avoid "Clear Completed")
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await page.waitForTimeout(200);

    // "Build a todo app" is the only pre-completed item — it should be visible
    await expect(page.locator('span:has-text("Build a todo app")').first()).toBeVisible();

    // Active items should NOT be visible
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")')).toHaveCount(0);
    await expect(page.locator('span:has-text("Share with the community")')).toHaveCount(0);
  });

  test('should filter to show only active todos', async ({ page }) => {
    // Click "Active" filter button
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await page.waitForTimeout(200);

    // Active items should be visible
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Share with the community")').first()).toBeVisible();

    // Completed item should NOT be visible
    await expect(page.locator('span:has-text("Build a todo app")')).toHaveCount(0);
  });

  test('should toggle a todo and then filter by completed', async ({ page }) => {
    // Toggle "Learn SwiftUI for Web" to completed by clicking its ○ checkbox button
    // The ○ buttons are the uncompleted checkboxes; find the first one (Learn SwiftUI)
    const uncheckedButtons = page.getByRole('button', { name: '○' });
    await uncheckedButtons.first().click();
    await page.waitForTimeout(300);

    // Verify toggle worked — the item should now show ✓
    await expect(page.getByRole('button', { name: '✓' })).toHaveCount(2);

    // Now click "Completed" filter
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await page.waitForTimeout(300);

    // Both completed items should show
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Build a todo app")').first()).toBeVisible();

    // Active item should NOT show
    await expect(page.locator('span:has-text("Share with the community")')).toHaveCount(0);
  });

  test('should switch between filters correctly', async ({ page }) => {
    // Completed filter
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('span:has-text("Build a todo app")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")')).toHaveCount(0);

    // Switch to All filter
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Build a todo app")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Share with the community")').first()).toBeVisible();

    // Switch to Active filter
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('span:has-text("Learn SwiftUI for Web")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Share with the community")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Build a todo app")')).toHaveCount(0);
  });
});
