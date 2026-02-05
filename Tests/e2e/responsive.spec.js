// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Responsive Grid Layout E2E Tests
 *
 * Requirements:
 * - Small screen (<480px): 1 card full width
 * - Tablet (768px-1023px): 2 cards per row
 * - Desktop (>=1024px): up to 8 cards per row
 */

test.describe('Netflix Responsive Grid', () => {
  test('should show 1 card per row on mobile (small screen)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/Examples/Netflix/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    // Wait for grid to render
    await page.waitForTimeout(500);

    // Find a grid container and check its columns
    const gridStyle = await page.evaluate(() => {
      // Find grid elements
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        const style = getComputedStyle(grid);
        const columns = style.gridTemplateColumns;
        // Return the number of columns if it's a movie grid (multiple items)
        if (grid.children.length > 0) {
          const columnCount = columns.split(' ').filter(c => c !== '').length;
          return { columns, columnCount };
        }
      }
      return null;
    });

    expect(gridStyle).not.toBeNull();
    expect(gridStyle.columnCount).toBe(1);
  });

  test('should show 2 cards per row on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/Examples/Netflix/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(500);

    const gridStyle = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        const style = getComputedStyle(grid);
        const columns = style.gridTemplateColumns;
        if (grid.children.length > 0) {
          const columnCount = columns.split(' ').filter(c => c !== '').length;
          return { columns, columnCount };
        }
      }
      return null;
    });

    expect(gridStyle).not.toBeNull();
    expect(gridStyle.columnCount).toBe(2);
  });

  test('should show up to 8 cards per row on large desktop', async ({ page }) => {
    // Set large desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/Examples/Netflix/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(500);

    const gridStyle = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        const style = getComputedStyle(grid);
        const columns = style.gridTemplateColumns;
        if (grid.children.length > 0) {
          const columnCount = columns.split(' ').filter(c => c !== '').length;
          return { columns, columnCount };
        }
      }
      return null;
    });

    expect(gridStyle).not.toBeNull();
    expect(gridStyle.columnCount).toBeGreaterThanOrEqual(6);
    expect(gridStyle.columnCount).toBeLessThanOrEqual(8);
  });

  test('should update grid on viewport resize', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/Examples/Netflix/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(500);

    // Get initial columns
    const initialColumns = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        if (grid.children.length > 0) {
          const style = getComputedStyle(grid);
          return style.gridTemplateColumns.split(' ').filter(c => c !== '').length;
        }
      }
      return 0;
    });

    expect(initialColumns).toBeGreaterThanOrEqual(4);

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for debounced resize handler
    await page.waitForTimeout(300);

    // Check columns after resize
    const mobileColumns = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        if (grid.children.length > 0) {
          const style = getComputedStyle(grid);
          return style.gridTemplateColumns.split(' ').filter(c => c !== '').length;
        }
      }
      return 0;
    });

    expect(mobileColumns).toBe(1);
  });
});

test.describe('Airbnb Responsive Grid', () => {
  test('should show 1 card per row on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/Examples/Airbnb/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(1000);

    const gridStyle = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        const style = getComputedStyle(grid);
        const columns = style.gridTemplateColumns;
        if (grid.children.length > 0) {
          const columnCount = columns.split(' ').filter(c => c !== '').length;
          return { columns, columnCount };
        }
      }
      return null;
    });

    expect(gridStyle).not.toBeNull();
    expect(gridStyle.columnCount).toBe(1);
  });

  test('should show 2 cards per row on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/Examples/Airbnb/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(1000);

    const gridStyle = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        const style = getComputedStyle(grid);
        const columns = style.gridTemplateColumns;
        if (grid.children.length > 0) {
          const columnCount = columns.split(' ').filter(c => c !== '').length;
          return { columns, columnCount };
        }
      }
      return null;
    });

    expect(gridStyle).not.toBeNull();
    expect(gridStyle.columnCount).toBe(2);
  });

  test('should show multiple cards per row on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/Examples/Airbnb/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(1000);

    const gridStyle = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        const style = getComputedStyle(grid);
        const columns = style.gridTemplateColumns;
        if (grid.children.length > 0) {
          const columnCount = columns.split(' ').filter(c => c !== '').length;
          return { columns, columnCount };
        }
      }
      return null;
    });

    expect(gridStyle).not.toBeNull();
    expect(gridStyle.columnCount).toBeGreaterThanOrEqual(4);
  });

  test('should update grid on viewport resize', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/Examples/Airbnb/');
    await page.waitForSelector('[data-swiftui-mounted="true"]', { timeout: 5000 });

    await page.waitForTimeout(1000);

    // Get initial columns
    const initialColumns = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        if (grid.children.length > 0) {
          const style = getComputedStyle(grid);
          return style.gridTemplateColumns.split(' ').filter(c => c !== '').length;
        }
      }
      return 0;
    });

    expect(initialColumns).toBeGreaterThanOrEqual(3);

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for debounced resize handler
    await page.waitForTimeout(300);

    // Check columns after resize
    const mobileColumns = await page.evaluate(() => {
      const grids = document.querySelectorAll('[style*="grid-template-columns"]');
      for (const grid of grids) {
        if (grid.children.length > 0) {
          const style = getComputedStyle(grid);
          return style.gridTemplateColumns.split(' ').filter(c => c !== '').length;
        }
      }
      return 0;
    });

    expect(mobileColumns).toBe(1);
  });
});
