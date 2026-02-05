/**
 * SwiftUI-For-Web Component E2E Tests
 *
 * Comprehensive testing of all components including:
 * - Layout components (VStack, HStack, ZStack, Spacer, Divider, Grid, GeometryReader)
 * - View components (Text, Image, Label)
 * - Control components (Button, TextField, Toggle, Slider, Stepper, Picker, etc.)
 * - List components (List, ForEach)
 * - Container components (ScrollView, Group, Form, DisclosureGroup)
 * - Shape components (Rectangle, Circle, Ellipse, Capsule, RoundedRectangle)
 * - Navigation components (TabView)
 * - State Management (ObservableObject, Published, Binding)
 * - Partial Re-rendering
 */

import { test, expect } from '@playwright/test';

const TEST_URL = '/Examples/TestShowcase/index.html';

// =============================================================================
// Layout Components Tests
// =============================================================================

test.describe('Layout Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="test-showcase"]');
  });

  test('VStack renders children vertically', async ({ page }) => {
    const container = page.locator('[data-testid="vstack-container"]');
    await expect(container).toBeVisible();

    // Check items exist
    await expect(page.locator('[data-testid="vstack-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="vstack-item-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="vstack-item-3"]')).toBeVisible();

    // Verify vertical layout (flex-direction: column)
    const style = await container.evaluate(el => getComputedStyle(el).flexDirection);
    expect(style).toBe('column');
  });

  test('HStack renders children horizontally', async ({ page }) => {
    const container = page.locator('[data-testid="hstack-container"]');
    await expect(container).toBeVisible();

    // Check items exist
    await expect(page.locator('[data-testid="hstack-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="hstack-item-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="hstack-item-3"]')).toBeVisible();

    // Verify horizontal layout (flex-direction: row)
    const style = await container.evaluate(el => getComputedStyle(el).flexDirection);
    expect(style).toBe('row');
  });

  test('ZStack layers children', async ({ page }) => {
    const container = page.locator('[data-testid="zstack-container"]');
    await expect(container).toBeVisible();

    const back = page.locator('[data-testid="zstack-back"]');
    const front = page.locator('[data-testid="zstack-front"]');

    await expect(back).toBeVisible();
    await expect(front).toBeVisible();

    // Verify ZStack uses grid for layering
    const display = await container.evaluate(el => getComputedStyle(el).display);
    expect(display).toBe('grid');
  });

  test('Spacer expands to fill space', async ({ page }) => {
    const spacer = page.locator('[data-testid="spacer"]');
    await expect(spacer).toBeVisible();

    // Spacer should have flex-grow
    const flexGrow = await spacer.evaluate(el => getComputedStyle(el).flexGrow);
    expect(flexGrow).toBe('1');
  });

  test('Divider renders horizontal line', async ({ page }) => {
    const divider = page.locator('[data-testid="divider"]');
    await expect(divider).toBeVisible();

    // Divider should have minimal height
    const height = await divider.evaluate(el => el.offsetHeight);
    expect(height).toBeLessThanOrEqual(2);
  });

  test('Grid renders in grid layout', async ({ page }) => {
    const container = page.locator('[data-testid="grid-container"]');
    await expect(container).toBeVisible();

    // Check all grid cells exist
    await expect(page.locator('[data-testid="grid-r1c1"]')).toBeVisible();
    await expect(page.locator('[data-testid="grid-r1c2"]')).toBeVisible();
    await expect(page.locator('[data-testid="grid-r2c1"]')).toBeVisible();
    await expect(page.locator('[data-testid="grid-r2c2"]')).toBeVisible();
  });

  test('GeometryReader provides size information', async ({ page }) => {
    const reader = page.locator('[data-testid="geometry-reader"]');
    await expect(reader).toBeVisible();

    // Check that width and height are displayed
    const widthText = page.locator('[data-testid="geometry-width"]');
    const heightText = page.locator('[data-testid="geometry-height"]');

    await expect(widthText).toBeVisible();
    await expect(heightText).toBeVisible();

    // Values should be numeric
    const widthContent = await widthText.textContent();
    const heightContent = await heightText.textContent();
    expect(widthContent).toMatch(/Width: \d+/);
    expect(heightContent).toMatch(/Height: \d+/);
  });
});

// =============================================================================
// View Components Tests
// =============================================================================

test.describe('View Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="view-section"]');
  });

  test('Text renders with correct content', async ({ page }) => {
    await expect(page.locator('[data-testid="text-plain"]')).toHaveText('Plain Text');
    await expect(page.locator('[data-testid="text-bold"]')).toHaveText('Bold Text');
    await expect(page.locator('[data-testid="text-italic"]')).toHaveText('Italic Text');
    await expect(page.locator('[data-testid="text-colored"]')).toHaveText('Colored Text');
  });

  test('Text applies font modifiers', async ({ page }) => {
    // Bold text should have bold font weight
    const boldWeight = await page.locator('[data-testid="text-bold"]').evaluate(
      el => getComputedStyle(el).fontWeight
    );
    expect(['bold', '700']).toContain(boldWeight);

    // Italic text should have italic font style
    const italicStyle = await page.locator('[data-testid="text-italic"]').evaluate(
      el => getComputedStyle(el).fontStyle
    );
    expect(italicStyle).toBe('italic');
  });

  test('Text applies color modifier', async ({ page }) => {
    const color = await page.locator('[data-testid="text-colored"]').evaluate(
      el => getComputedStyle(el).color
    );
    // Blue color
    expect(color).toMatch(/rgb\(0, 122, 255\)|rgb\(0,122,255\)/);
  });

  test('Label renders with icon and text', async ({ page }) => {
    const starLabel = page.locator('[data-testid="label-star"]');
    const heartLabel = page.locator('[data-testid="label-heart"]');
    const gearLabel = page.locator('[data-testid="label-gear"]');

    await expect(starLabel).toBeVisible();
    await expect(heartLabel).toBeVisible();
    await expect(gearLabel).toBeVisible();

    // Labels should contain text
    await expect(starLabel).toContainText('Star Label');
    await expect(heartLabel).toContainText('Heart Label');
    await expect(gearLabel).toContainText('Gear Label');
  });

  test('Image renders correctly', async ({ page }) => {
    const image = page.locator('[data-testid="image-test"]');
    await expect(image).toBeVisible();

    // Check image has correct dimensions
    const width = await image.evaluate(el => el.offsetWidth);
    const height = await image.evaluate(el => el.offsetHeight);
    expect(width).toBe(50);
    expect(height).toBe(50);
  });
});

// =============================================================================
// Control Components Tests
// =============================================================================

test.describe('Control Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="control-section"]');
  });

  test('Button renders and is clickable', async ({ page }) => {
    const primaryBtn = page.locator('[data-testid="button-primary"]');
    const secondaryBtn = page.locator('[data-testid="button-secondary"]');
    const dangerBtn = page.locator('[data-testid="button-danger"]');

    await expect(primaryBtn).toBeVisible();
    await expect(secondaryBtn).toBeVisible();
    await expect(dangerBtn).toBeVisible();

    // Should be clickable (no errors)
    await primaryBtn.click();
    await secondaryBtn.click();
    await dangerBtn.click();
  });

  test('Button applies styles correctly', async ({ page }) => {
    const primaryBtn = page.locator('[data-testid="button-primary"]');

    // Check background color is blue
    const bgColor = await primaryBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bgColor).toMatch(/rgb\(0, 122, 255\)|rgb\(0,122,255\)/);
  });

  test('TextField renders and accepts input', async ({ page }) => {
    const textfield = page.locator('[data-testid="textfield"]');
    await expect(textfield).toBeVisible();

    // Clear and type
    await textfield.fill('Test input');

    // Check value updated
    await expect(textfield).toHaveValue('Test input');
  });

  test('SecureField renders as password input', async ({ page }) => {
    const securefield = page.locator('[data-testid="securefield"]');
    await expect(securefield).toBeVisible();

    // Check it's a password type
    const type = await securefield.getAttribute('type');
    expect(type).toBe('password');
  });

  test('Toggle renders and can be toggled', async ({ page }) => {
    const toggle = page.locator('[data-testid="toggle"]');
    const label = page.locator('[data-testid="toggle-label"]');

    await expect(toggle).toBeVisible();

    // Get initial state
    const initialText = await label.textContent();

    // Click toggle
    await toggle.click();

    // State should change
    const newText = await label.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('Slider renders and can be adjusted', async ({ page }) => {
    const slider = page.locator('[data-testid="slider"]');
    const value = page.locator('[data-testid="slider-value"]');

    await expect(slider).toBeVisible();
    await expect(value).toBeVisible();

    // Check initial value is displayed
    const initialValue = await value.textContent();
    expect(initialValue).toBeTruthy();
  });

  test('Stepper renders with increment/decrement controls', async ({ page }) => {
    const stepper = page.locator('[data-testid="stepper"]');
    await expect(stepper).toBeVisible();

    // Stepper should contain value text and buttons
    await expect(stepper).toContainText('Value:');
  });

  test('Picker renders with options', async ({ page }) => {
    const picker = page.locator('[data-testid="picker"]');
    await expect(picker).toBeVisible();
  });

  test('DatePicker renders', async ({ page }) => {
    const datepicker = page.locator('[data-testid="datepicker"]');
    await expect(datepicker).toBeVisible();
  });

  test('ColorPicker renders', async ({ page }) => {
    const colorpicker = page.locator('[data-testid="colorpicker"]');
    await expect(colorpicker).toBeVisible();
  });
});

// =============================================================================
// List Components Tests
// =============================================================================

test.describe('List Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="list-section"]');
  });

  test('ForEach renders all items', async ({ page }) => {
    const container = page.locator('[data-testid="foreach-container"]');
    await expect(container).toBeVisible();

    // Check initial items
    await expect(page.locator('[data-testid="foreach-item-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="foreach-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="foreach-item-2"]')).toBeVisible();
  });

  test('ForEach can add items', async ({ page }) => {
    const addBtn = page.locator('[data-testid="foreach-add"]');

    // Count initial items
    const initialCount = await page.locator('[data-testid^="foreach-item-"]').count();

    // Add item
    await addBtn.click();

    // Wait for re-render
    await page.waitForTimeout(100);

    // Should have one more item
    const newCount = await page.locator('[data-testid^="foreach-item-"]').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('ForEach can remove items', async ({ page }) => {
    // Count initial items
    const initialCount = await page.locator('[data-testid^="foreach-item-"]').count();

    // Remove first item
    await page.locator('[data-testid="foreach-remove-0"]').click();

    // Wait for re-render
    await page.waitForTimeout(100);

    // Should have one less item
    const newCount = await page.locator('[data-testid^="foreach-item-"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('List renders with items', async ({ page }) => {
    const list = page.locator('[data-testid="list-container"]');
    await expect(list).toBeVisible();

    // Check list items
    await expect(page.locator('[data-testid="list-item-apple"]')).toBeVisible();
    await expect(page.locator('[data-testid="list-item-banana"]')).toBeVisible();
    await expect(page.locator('[data-testid="list-item-cherry"]')).toBeVisible();
  });
});

// =============================================================================
// Container Components Tests
// =============================================================================

test.describe('Container Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="container-section"]');
  });

  test('ScrollView renders with scrollable content', async ({ page }) => {
    const scrollview = page.locator('[data-testid="scrollview"]');
    await expect(scrollview).toBeVisible();

    // Check scroll items exist
    await expect(page.locator('[data-testid="scroll-item-1"]')).toBeVisible();

    // ScrollView should have overflow
    const overflow = await scrollview.evaluate(el => getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflow);
  });

  test('Group renders children', async ({ page }) => {
    const group = page.locator('[data-testid="group-container"]');
    await expect(group).toBeVisible();

    await expect(page.locator('[data-testid="group-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-item-2"]')).toBeVisible();
  });

  test('Form renders with sections', async ({ page }) => {
    const form = page.locator('[data-testid="form-container"]');
    await expect(form).toBeVisible();

    await expect(page.locator('[data-testid="form-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-item-2"]')).toBeVisible();
  });

  test('DisclosureGroup can be expanded', async ({ page }) => {
    const disclosure = page.locator('[data-testid="disclosure-group"]');
    await expect(disclosure).toBeVisible();

    // Click to expand
    await disclosure.click();

    // Content should be visible after expansion
    // (timing depends on implementation)
    await page.waitForTimeout(300);
  });
});

// =============================================================================
// Shape Components Tests
// =============================================================================

test.describe('Shape Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="shape-section"]');
  });

  test('Rectangle renders', async ({ page }) => {
    const rect = page.locator('[data-testid="shape-rectangle"]');
    await expect(rect).toBeVisible();

    const width = await rect.evaluate(el => el.offsetWidth);
    const height = await rect.evaluate(el => el.offsetHeight);
    expect(width).toBe(60);
    expect(height).toBe(40);
  });

  test('RoundedRectangle renders with border radius', async ({ page }) => {
    const rounded = page.locator('[data-testid="shape-rounded-rectangle"]');
    await expect(rounded).toBeVisible();

    const borderRadius = await rounded.evaluate(el => getComputedStyle(el).borderRadius);
    expect(borderRadius).toContain('12px');
  });

  test('Circle renders', async ({ page }) => {
    const circle = page.locator('[data-testid="shape-circle"]');
    await expect(circle).toBeVisible();

    // Circle should have 50% border radius
    const borderRadius = await circle.evaluate(el => getComputedStyle(el).borderRadius);
    expect(borderRadius).toBe('50%');
  });

  test('Ellipse renders', async ({ page }) => {
    const ellipse = page.locator('[data-testid="shape-ellipse"]');
    await expect(ellipse).toBeVisible();

    const width = await ellipse.evaluate(el => el.offsetWidth);
    const height = await ellipse.evaluate(el => el.offsetHeight);
    expect(width).toBe(70);
    expect(height).toBe(40);
  });

  test('Capsule renders with rounded ends', async ({ page }) => {
    const capsule = page.locator('[data-testid="shape-capsule"]');
    await expect(capsule).toBeVisible();

    // Capsule should have border radius equal to half its height
    const borderRadius = await capsule.evaluate(el => getComputedStyle(el).borderRadius);
    expect(borderRadius).toContain('15px'); // half of 30px height
  });

  test('Shape with stroke renders', async ({ page }) => {
    const stroke = page.locator('[data-testid="shape-stroke"]');
    await expect(stroke).toBeVisible();

    // Should have border
    const border = await stroke.evaluate(el => getComputedStyle(el).border);
    expect(border).toContain('3px');
  });

  test('Shape with gradient renders', async ({ page }) => {
    const gradient = page.locator('[data-testid="shape-gradient"]');
    await expect(gradient).toBeVisible();

    // Background should be gradient
    const bg = await gradient.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
  });
});

// =============================================================================
// Navigation Components Tests
// =============================================================================

test.describe('Navigation Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="navigation-section"]');
  });

  test('TabView renders', async ({ page }) => {
    const tabview = page.locator('[data-testid="tabview"]');
    await expect(tabview).toBeVisible();
  });
});

// =============================================================================
// State Management Tests
// =============================================================================

test.describe('State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="state-section"]');
  });

  test('ObservableObject counter increments', async ({ page }) => {
    const value = page.locator('[data-testid="counter-value"]');
    const incrementBtn = page.locator('[data-testid="counter-increment"]');

    const initialValue = await value.textContent();
    const initial = parseInt(initialValue, 10);

    await incrementBtn.click();
    await page.waitForTimeout(100);

    const newValue = await value.textContent();
    expect(parseInt(newValue, 10)).toBe(initial + 1);
  });

  test('ObservableObject counter decrements', async ({ page }) => {
    const value = page.locator('[data-testid="counter-value"]');
    const decrementBtn = page.locator('[data-testid="counter-decrement"]');

    const initialValue = await value.textContent();
    const initial = parseInt(initialValue, 10);

    await decrementBtn.click();
    await page.waitForTimeout(100);

    const newValue = await value.textContent();
    expect(parseInt(newValue, 10)).toBe(initial - 1);
  });

  test('Binding updates text in real-time', async ({ page }) => {
    const input = page.locator('[data-testid="binding-input"]');
    const output = page.locator('[data-testid="binding-output"]');

    await input.fill('Binding Test');
    await page.waitForTimeout(100);

    const outputText = await output.textContent();
    expect(outputText).toContain('Binding Test');
  });

  test('Toggle binding updates status', async ({ page }) => {
    const toggle = page.locator('[data-testid="binding-toggle"]');
    const status = page.locator('[data-testid="binding-toggle-status"]');

    const initialStatus = await status.textContent();

    await toggle.click();
    await page.waitForTimeout(100);

    const newStatus = await status.textContent();
    expect(newStatus).not.toBe(initialStatus);
  });
});

// =============================================================================
// Partial Re-rendering Tests
// =============================================================================

test.describe('Partial Re-rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="state-section"]');
  });

  test('Dynamic list updates item count correctly', async ({ page }) => {
    const countLabel = page.locator('[data-testid="dynamic-list-count"]');
    const addBtn = page.locator('[data-testid="dynamic-add-item"]');

    const initialText = await countLabel.textContent();
    const initialCount = parseInt(initialText.match(/\d+/)[0], 10);

    await addBtn.click();
    await page.waitForTimeout(100);

    const newText = await countLabel.textContent();
    const newCount = parseInt(newText.match(/\d+/)[0], 10);

    expect(newCount).toBe(initialCount + 1);
  });

  test('Dynamic list adds new item at end', async ({ page }) => {
    const addBtn = page.locator('[data-testid="dynamic-add-item"]');

    // Get initial items
    const initialItems = await page.locator('[data-testid^="dynamic-item-"]').allTextContents();

    await addBtn.click();
    await page.waitForTimeout(100);

    // Check new item was added
    const newItems = await page.locator('[data-testid^="dynamic-item-"]').allTextContents();
    expect(newItems.length).toBe(initialItems.length + 1);
  });

  test('Dynamic list removes specific item', async ({ page }) => {
    // Get initial item text
    const firstItemText = await page.locator('[data-testid="dynamic-item-0"]').textContent();

    // Remove first item
    await page.locator('[data-testid="dynamic-remove-0"]').click();
    await page.waitForTimeout(100);

    // Check first item is now different
    const newFirstItemText = await page.locator('[data-testid="dynamic-item-0"]').textContent();
    expect(newFirstItemText).not.toBe(firstItemText);
  });

  test('Multiple rapid updates are handled correctly', async ({ page }) => {
    const incrementBtn = page.locator('[data-testid="counter-increment"]');
    const value = page.locator('[data-testid="counter-value"]');

    const initialValue = await value.textContent();
    const initial = parseInt(initialValue, 10);

    // Rapid clicks
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();

    await page.waitForTimeout(200);

    const finalValue = await value.textContent();
    expect(parseInt(finalValue, 10)).toBe(initial + 5);
  });

  test('UI stays consistent after multiple state changes', async ({ page }) => {
    const addBtn = page.locator('[data-testid="dynamic-add-item"]');
    const countLabel = page.locator('[data-testid="dynamic-list-count"]');

    // Add multiple items
    await addBtn.click();
    await addBtn.click();
    await addBtn.click();

    await page.waitForTimeout(200);

    // Check count matches actual items
    const countText = await countLabel.textContent();
    const count = parseInt(countText.match(/\d+/)[0], 10);

    const actualItems = await page.locator('[data-testid^="dynamic-item-"]').count();
    expect(actualItems).toBe(count);
  });
});

// =============================================================================
// Console Error Tests
// =============================================================================

test.describe('No Console Errors', () => {
  test('TestShowcase loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="test-showcase"]');

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

test.describe('Performance', () => {
  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="test-showcase"]');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('State updates complete within acceptable time', async ({ page }) => {
    await page.goto(TEST_URL);
    await page.waitForSelector('[data-testid="counter-increment"]');

    const startTime = Date.now();

    await page.locator('[data-testid="counter-increment"]').click();
    await page.waitForTimeout(50);

    const updateTime = Date.now() - startTime;

    // State update should complete within 200ms
    expect(updateTime).toBeLessThan(200);
  });
});
