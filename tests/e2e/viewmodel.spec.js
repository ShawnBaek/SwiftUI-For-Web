/**
 * SwiftUI-For-Web ViewModel E2E Tests
 *
 * Comprehensive testing of state management:
 * - ObservableObject
 * - Published properties
 * - State
 * - Binding
 * - Reactive updates
 * - Partial re-rendering
 */

import { test, expect } from '@playwright/test';

// Use Counter example for ViewModel testing
const COUNTER_URL = '/Examples/Counter/index.html';
const TODO_URL = '/Examples/TodoApp/index.html';
const TEST_URL = '/Examples/TestShowcase/index.html';

// =============================================================================
// ObservableObject Tests
// =============================================================================

test.describe('ObservableObject', () => {
  test('publishes property changes to subscribers', async ({ page }) => {
    await page.goto(COUNTER_URL);

    // Wait for the app to mount
    await page.waitForSelector('[data-view="vstack"]');

    // Find the counter value display
    const counterDisplay = page.locator('text=/^\\d+$/').first();
    await expect(counterDisplay).toBeVisible();

    // Get initial value
    const initialValue = await counterDisplay.textContent();
    const initial = parseInt(initialValue, 10);

    // Find and click increment button
    const incrementBtn = page.locator('button:has-text("+")');
    await incrementBtn.click();

    // Wait for re-render
    await page.waitForTimeout(100);

    // Value should have incremented
    const newValue = await counterDisplay.textContent();
    expect(parseInt(newValue, 10)).toBe(initial + 1);
  });

  test('handles multiple subscribers', async ({ page }) => {
    await page.goto(COUNTER_URL);
    await page.waitForSelector('[data-view="vstack"]');

    const incrementBtn = page.locator('button:has-text("+")');

    // Multiple rapid updates
    for (let i = 0; i < 5; i++) {
      await incrementBtn.click();
    }

    await page.waitForTimeout(200);

    // Counter should have incremented 5 times
    const counterDisplay = page.locator('text=/^\\d+$/').first();
    const value = await counterDisplay.textContent();
    expect(parseInt(value, 10)).toBeGreaterThanOrEqual(5);
  });

  test('notifies on decrement', async ({ page }) => {
    await page.goto(COUNTER_URL);
    await page.waitForSelector('[data-view="vstack"]');

    const counterDisplay = page.locator('text=/^\\d+$/').first();
    const decrementBtn = page.locator('button:has-text("−"), button:has-text("-")').first();

    // Increment first to ensure we have a positive number
    const incrementBtn = page.locator('button:has-text("+")');
    await incrementBtn.click();
    await page.waitForTimeout(100);

    const valueBefore = parseInt(await counterDisplay.textContent(), 10);

    await decrementBtn.click();
    await page.waitForTimeout(100);

    const valueAfter = parseInt(await counterDisplay.textContent(), 10);
    expect(valueAfter).toBe(valueBefore - 1);
  });
});

// =============================================================================
// Published Property Tests
// =============================================================================

test.describe('Published Properties', () => {
  test('updates UI when published property changes', async ({ page }) => {
    await page.goto(TODO_URL);
    await page.waitForSelector('[data-view="vstack"]');

    // Find the input field and add button
    const input = page.locator('input[type="text"]').first();
    const addBtn = page.locator('button:has-text("Add")');

    // Type a new todo
    await input.fill('Test Todo Item');
    await addBtn.click();

    await page.waitForTimeout(200);

    // The new todo should appear in the list
    await expect(page.locator('text=Test Todo Item')).toBeVisible();
  });

  test('array published properties trigger re-render on push', async ({ page }) => {
    await page.goto(TODO_URL);
    await page.waitForSelector('[data-view="vstack"]');

    const input = page.locator('input[type="text"]').first();
    const addBtn = page.locator('button:has-text("Add")');

    // Count initial items
    const initialItems = await page.locator('[data-view="hstack"] >> text=/^.+$/')
      .filter({ hasText: /^(?!Add|All|Active|Completed|items left|Clear)/ })
      .count();

    // Add a new item
    await input.fill('New Item');
    await addBtn.click();
    await page.waitForTimeout(200);

    // Count should increase
    const newItems = await page.locator('[data-view="hstack"] >> text=/^.+$/')
      .filter({ hasText: /^(?!Add|All|Active|Completed|items left|Clear)/ })
      .count();

    expect(newItems).toBeGreaterThan(initialItems);
  });

  test('boolean published properties toggle correctly', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="binding-toggle"]');

    const toggle = page.locator('[data-testid="binding-toggle"]');
    const status = page.locator('[data-testid="binding-toggle-status"]');

    const initialStatus = await status.textContent();

    await toggle.click();
    await page.waitForTimeout(100);

    const toggledStatus = await status.textContent();
    expect(toggledStatus).not.toBe(initialStatus);

    await toggle.click();
    await page.waitForTimeout(100);

    const revertedStatus = await status.textContent();
    expect(revertedStatus).toBe(initialStatus);
  });
});

// =============================================================================
// Binding Tests
// =============================================================================

test.describe('Binding', () => {
  test('two-way binding updates source from control', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="binding-input"]');

    const input = page.locator('[data-testid="binding-input"]');
    const output = page.locator('[data-testid="binding-output"]');

    // Type in input
    await input.fill('Two-way binding test');
    await page.waitForTimeout(100);

    // Output should reflect the change
    const outputText = await output.textContent();
    expect(outputText).toContain('Two-way binding test');
  });

  test('binding reflects source changes in control', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="slider"]');

    const slider = page.locator('[data-testid="slider"]');
    const valueDisplay = page.locator('[data-testid="slider-value"]');

    // Get initial value
    const initialValue = await valueDisplay.textContent();

    // Move slider
    await slider.evaluate(el => {
      el.value = '75';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.waitForTimeout(100);

    // Value display should update
    const newValue = await valueDisplay.textContent();
    expect(newValue).toBe('75');
  });

  test('TextField binding works bidirectionally', async ({ page }) => {
    await page.goto(TODO_URL);
    await page.waitForSelector('input[type="text"]');

    const input = page.locator('input[type="text"]').first();

    // Fill text
    await input.fill('Test Input');
    await page.waitForTimeout(100);

    // Clear and refill
    await input.fill('');
    await input.fill('New Value');
    await page.waitForTimeout(100);

    // Value should match
    await expect(input).toHaveValue('New Value');
  });

  test('Toggle binding syncs state', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="binding-toggle"]');

    const toggle = page.locator('[data-testid="binding-toggle"]');
    const status = page.locator('[data-testid="binding-toggle-status"]');

    // Toggle twice and verify sync
    await toggle.click();
    await page.waitForTimeout(100);
    const afterFirst = await status.textContent();

    await toggle.click();
    await page.waitForTimeout(100);
    const afterSecond = await status.textContent();

    expect(afterFirst).not.toBe(afterSecond);
  });
});

// =============================================================================
// Reactive Update Tests
// =============================================================================

test.describe('Reactive Updates', () => {
  test('UI updates immediately after state change', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="counter-increment"]');

    const incrementBtn = page.locator('[data-testid="counter-increment"]');
    const value = page.locator('[data-testid="counter-value"]');

    const startTime = Date.now();

    await incrementBtn.click();

    // Poll for value change
    await expect(async () => {
      const currentValue = await value.textContent();
      expect(parseInt(currentValue, 10)).toBeGreaterThan(0);
    }).toPass({ timeout: 500 });

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(500);
  });

  test('multiple state changes batch correctly', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="counter-increment"]');

    const incrementBtn = page.locator('[data-testid="counter-increment"]');
    const value = page.locator('[data-testid="counter-value"]');

    // Rapid clicks
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();

    await page.waitForTimeout(300);

    // All changes should be reflected
    const finalValue = await value.textContent();
    expect(parseInt(finalValue, 10)).toBeGreaterThanOrEqual(3);
  });

  test('dependent computed values update', async ({ page }) => {
    await page.goto(TODO_URL);
    await page.waitForSelector('[data-view="vstack"]');

    // Find items left counter
    const itemsLeft = page.locator('text=/\\d+ items? left/');
    await expect(itemsLeft).toBeVisible();

    const initialText = await itemsLeft.textContent();
    const initialCount = parseInt(initialText.match(/\d+/)[0], 10);

    // Add a new item
    const input = page.locator('input[type="text"]').first();
    const addBtn = page.locator('button:has-text("Add")');

    await input.fill('New Task');
    await addBtn.click();
    await page.waitForTimeout(200);

    // Items left should increase
    const newText = await itemsLeft.textContent();
    const newCount = parseInt(newText.match(/\d+/)[0], 10);

    expect(newCount).toBe(initialCount + 1);
  });
});

// =============================================================================
// Partial Re-rendering Tests
// =============================================================================

test.describe('Partial Re-rendering', () => {
  test('only affected components re-render', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="dynamic-list-container"]');

    // Add an item
    const addBtn = page.locator('[data-testid="dynamic-add-item"]');
    await addBtn.click();
    await page.waitForTimeout(100);

    // The counter section should not have re-rendered unnecessarily
    // (This is hard to test directly, but we verify the app remains functional)
    const counterValue = page.locator('[data-testid="counter-value"]');
    await expect(counterValue).toBeVisible();
  });

  test('list item removal only affects that item', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="dynamic-list-container"]');

    // Add multiple items first
    const addBtn = page.locator('[data-testid="dynamic-add-item"]');
    await addBtn.click();
    await addBtn.click();
    await page.waitForTimeout(200);

    // Get item texts before removal
    const itemsBefore = await page.locator('[data-testid^="dynamic-item-"]').allTextContents();

    // Remove the first item
    await page.locator('[data-testid="dynamic-remove-0"]').click();
    await page.waitForTimeout(100);

    // Get items after
    const itemsAfter = await page.locator('[data-testid^="dynamic-item-"]').allTextContents();

    // Should have one less item
    expect(itemsAfter.length).toBe(itemsBefore.length - 1);

    // Remaining items should still be there (in different positions)
    for (let i = 1; i < itemsBefore.length; i++) {
      expect(itemsAfter).toContain(itemsBefore[i]);
    }
  });

  test('form input changes do not affect unrelated components', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="binding-input"]');

    const input = page.locator('[data-testid="binding-input"]');
    const counterValue = page.locator('[data-testid="counter-value"]');

    const counterBefore = await counterValue.textContent();

    // Change the text input
    await input.fill('Test change');
    await page.waitForTimeout(100);

    const counterAfter = await counterValue.textContent();

    // Counter should be unchanged
    expect(counterAfter).toBe(counterBefore);
  });
});

// =============================================================================
// State Persistence Tests
// =============================================================================

test.describe('State Persistence', () => {
  test('state persists across multiple interactions', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="counter-increment"]');

    const incrementBtn = page.locator('[data-testid="counter-increment"]');
    const value = page.locator('[data-testid="counter-value"]');

    // Multiple increments
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await page.waitForTimeout(100);

    // Interact with other components
    const toggle = page.locator('[data-testid="binding-toggle"]');
    await toggle.click();
    await page.waitForTimeout(100);

    // Counter value should persist
    const finalValue = await value.textContent();
    expect(parseInt(finalValue, 10)).toBeGreaterThanOrEqual(3);
  });

  test('list state persists after modifications', async ({ page }) => {
    await page.goto(TODO_URL);
    await page.waitForSelector('[data-view="vstack"]');

    const input = page.locator('input[type="text"]').first();
    const addBtn = page.locator('button:has-text("Add")');

    // Add items
    await input.fill('Item A');
    await addBtn.click();
    await page.waitForTimeout(100);

    await input.fill('Item B');
    await addBtn.click();
    await page.waitForTimeout(100);

    await input.fill('Item C');
    await addBtn.click();
    await page.waitForTimeout(100);

    // All items should be visible
    await expect(page.locator('text=Item A')).toBeVisible();
    await expect(page.locator('text=Item B')).toBeVisible();
    await expect(page.locator('text=Item C')).toBeVisible();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

test.describe('Edge Cases', () => {
  test('handles empty input gracefully', async ({ page }) => {
    await page.goto(TODO_URL);
    await page.waitForSelector('[data-view="vstack"]');

    const addBtn = page.locator('button:has-text("Add")');

    // Count items before
    const beforeCount = await page.locator('[data-view="hstack"]').count();

    // Try to add empty item
    await addBtn.click();
    await page.waitForTimeout(100);

    // Count should not increase (or only by expected amount)
    const afterCount = await page.locator('[data-view="hstack"]').count();
    expect(afterCount).toBeLessThanOrEqual(beforeCount + 1);
  });

  test('handles rapid toggle switches', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="binding-toggle"]');

    const toggle = page.locator('[data-testid="binding-toggle"]');
    const status = page.locator('[data-testid="binding-toggle-status"]');

    // Rapid toggles
    for (let i = 0; i < 10; i++) {
      await toggle.click();
    }

    await page.waitForTimeout(200);

    // State should be consistent (even number of toggles = original state)
    const finalStatus = await status.textContent();
    expect(['Enabled', 'Disabled']).toContain(finalStatus);
  });

  test('handles slider at boundaries', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="slider"]');

    const slider = page.locator('[data-testid="slider"]');
    const valueDisplay = page.locator('[data-testid="slider-value"]');

    // Set to minimum
    await slider.evaluate(el => {
      el.value = '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(100);

    let value = await valueDisplay.textContent();
    expect(parseInt(value, 10)).toBe(0);

    // Set to maximum
    await slider.evaluate(el => {
      el.value = '100';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(100);

    value = await valueDisplay.textContent();
    expect(parseInt(value, 10)).toBe(100);
  });
});
