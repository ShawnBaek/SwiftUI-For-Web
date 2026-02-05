// @ts-check
import { test, expect } from '@playwright/test';

/**
 * SwiftUI-For-Web Examples E2E Tests
 * Verifies that all examples render correctly
 */

test.describe('Examples Rendering', () => {

  test.describe('Counter Example', () => {
    test('should render counter view', async ({ page }) => {
      await page.goto('/Examples/Counter/');

      // Wait for app to mount
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Check that root has content
      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Check for counter text
      const counterText = page.locator('text=Counter');
      await expect(counterText).toBeVisible();

      // Check for number display (initial value 0)
      const numberDisplay = page.locator('text=0');
      await expect(numberDisplay).toBeVisible();

      // Check for buttons
      const buttons = page.locator('button');
      await expect(buttons).toHaveCount(3); // -, Reset, +
    });

    test('should increment and decrement counter', async ({ page }) => {
      await page.goto('/Examples/Counter/');
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Get initial value
      const display = page.locator('span').filter({ hasText: /^0$/ }).first();

      // Click + button
      await page.locator('button', { hasText: '+' }).click();

      // Check value is now 1
      await expect(page.locator('span').filter({ hasText: /^1$/ }).first()).toBeVisible();

      // Click - button
      await page.locator('button', { hasText: '−' }).click();

      // Check value is back to 0
      await expect(page.locator('span').filter({ hasText: /^0$/ }).first()).toBeVisible();
    });
  });

  test.describe('HelloWorld Example', () => {
    test('should render hello world view', async ({ page }) => {
      await page.goto('/Examples/HelloWorld/');

      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Check for hello text
      const helloText = page.locator('text=Hello');
      await expect(helloText).toBeVisible();
    });
  });

  test.describe('TodoApp Example', () => {
    test('should render todo app', async ({ page }) => {
      await page.goto('/Examples/TodoApp/');

      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Check for input field
      const input = page.locator('input[type="text"]');
      await expect(input).toBeVisible();

      // Check for add button
      const addButton = page.locator('button', { hasText: /add/i });
      await expect(addButton).toBeVisible();
    });

    test('should add a todo item', async ({ page }) => {
      await page.goto('/Examples/TodoApp/');
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Type in input
      const input = page.locator('input[type="text"]').first();
      await input.fill('Test Todo Item');

      // Click add button
      await page.locator('button', { hasText: /add/i }).click();

      // Check that todo appears
      await expect(page.locator('text=Test Todo Item')).toBeVisible();
    });
  });

  test.describe('Charts Example', () => {
    test('should render charts demo', async ({ page }) => {
      await page.goto('/Examples/Charts/');

      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Check for title
      const title = page.locator('text=Swift Charts for Web');
      await expect(title).toBeVisible();

      // Check for SVG charts
      const svgs = page.locator('svg');
      const svgCount = await svgs.count();
      expect(svgCount).toBeGreaterThan(0);
    });

    test('should render bar chart with bars', async ({ page }) => {
      await page.goto('/Examples/Charts/');
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Check for bar chart section
      await expect(page.locator('text=Bar Chart')).toBeVisible();

      // Check for SVG rect elements (bars)
      const rects = page.locator('svg rect');
      const rectCount = await rects.count();
      expect(rectCount).toBeGreaterThan(0);
    });

    test('should render pie chart with paths', async ({ page }) => {
      await page.goto('/Examples/Charts/');
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Check for pie chart section
      await expect(page.locator('text=Pie Chart')).toBeVisible();

      // Check for SVG path elements (pie slices)
      const paths = page.locator('svg path');
      const pathCount = await paths.count();
      expect(pathCount).toBeGreaterThan(0);
    });
  });

  test.describe('Airbnb Example', () => {
    test('should render airbnb app', async ({ page }) => {
      await page.goto('/Examples/Airbnb/');

      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Check for search bar or header
      const searchOrHeader = page.locator('input, [data-view="header"]').first();
      await expect(searchOrHeader).toBeVisible();
    });

    test('should render listing cards', async ({ page }) => {
      await page.goto('/Examples/Airbnb/');
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Check for images (listing photos)
      const images = page.locator('img');
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThan(0);
    });
  });

  test.describe('Netflix Example', () => {
    test('should render netflix app', async ({ page }) => {
      await page.goto('/Examples/Netflix/');

      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      const root = page.locator('#root');
      await expect(root).not.toBeEmpty();

      // Check for Netflix logo or title
      const netflix = page.locator('text=NETFLIX');
      await expect(netflix).toBeVisible();
    });

    test('should render movie cards', async ({ page }) => {
      await page.goto('/Examples/Netflix/');
      await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

      // Check for movie images
      const images = page.locator('img');
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThan(0);
    });
  });

});

test.describe('No Console Errors', () => {
  const examples = [
    { name: 'Counter', path: '/Examples/Counter/' },
    { name: 'HelloWorld', path: '/Examples/HelloWorld/' },
    { name: 'TodoApp', path: '/Examples/TodoApp/' },
    { name: 'Charts', path: '/Examples/Charts/' },
    { name: 'Airbnb', path: '/Examples/Airbnb/' },
    { name: 'Netflix', path: '/Examples/Netflix/' },
  ];

  for (const example of examples) {
    test(`${example.name} should have no console errors`, async ({ page }) => {
      const errors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        errors.push(err.message);
      });

      await page.goto(example.path);

      // Wait a bit for any async errors
      await page.waitForTimeout(2000);

      // Filter out known acceptable errors (like favicon)
      const realErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('404')
      );

      expect(realErrors).toHaveLength(0);
    });
  }
});
