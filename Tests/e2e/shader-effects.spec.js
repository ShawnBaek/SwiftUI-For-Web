/**
 * Shader effects e2e — verifies that `.colorEffect()` / `.distortionEffect()` /
 * `.layerEffect()` actually mount SVG <filter> definitions into document.head
 * and that the corresponding DOM elements carry `filter: url(#…)` inline
 * styles in a real browser.
 *
 * The Node mock runner can verify descriptor wiring; this spec verifies the
 * piece that mock can't fake: real SVG filter mounting and CSS filter
 * composition in an actual browser layout/paint pipeline.
 */

import { test, expect } from '@playwright/test';

const PAGE = '/Examples/ShaderEffects/index.html';

test.describe('Shader effects · ShaderEffects example', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    // Wait for the App to mount the title.
    await expect(page.getByText('Shader Effects', { exact: true })).toBeVisible();
  });

  test('mounts a shared <svg><defs> with <filter> definitions in document.head', async ({ page }) => {
    // The renderer creates one hidden SVG in <head> and appends each unique
    // shader's <filter> into its <defs>.
    const headFilterCount = await page.evaluate(() => {
      return document.head.querySelectorAll('svg > defs > filter').length;
    });
    // Demo uses many distinct shaders (grayscale, sepia, invert, hueRotate,
    // saturation, brightness, contrast, several blurs, dropShadow, ripples,
    // and the composed ones). At minimum we should see ≥10 filters.
    expect(headFilterCount).toBeGreaterThanOrEqual(10);
  });

  test('every <filter> has a stable swfw-shader id and SVG primitive children', async ({ page }) => {
    const info = await page.evaluate(() => {
      const filters = Array.from(document.head.querySelectorAll('svg > defs > filter'));
      return filters.map(f => ({
        id: f.getAttribute('id'),
        childTags: Array.from(f.children).map(c => c.tagName.toLowerCase())
      }));
    });
    for (const { id, childTags } of info) {
      expect(id).toMatch(/^swfw-shader-/);
      expect(childTags.length).toBeGreaterThan(0);
      // Every primitive must be in the SVG filter primitive family.
      for (const tag of childTags) {
        expect(tag).toMatch(/^fe(colormatrix|componenttransfer|gaussianblur|offset|flood|composite|merge|turbulence|displacementmap)$/);
      }
    }
  });

  test('Image with .colorEffect(grayscale) carries the matching url(#id) in inline style.filter', async ({ page }) => {
    // Find any <img> whose inline filter references the grayscale shader —
    // don't depend on layout order. Browsers serialize as `url("#id")` with
    // quotes, so match on the bare id substring.
    const styleFilter = await page.evaluate(() => {
      const img = Array.from(document.querySelectorAll('img'))
        .find(el => el.style.filter && el.style.filter.includes('#swfw-shader-grayscale-'));
      return img ? img.style.filter : null;
    });
    expect(styleFilter, 'expected at least one <img> with the grayscale shader filter').toBeTruthy();
    expect(styleFilter).toContain('#swfw-shader-grayscale-');
  });

  test('composed .colorEffect().layerEffect() produces two space-separated url() refs', async ({ page }) => {
    // The "sepia + blur" composed tile uses two shaders chained — its <img>
    // must carry both url() references with sepia ordered before blur.
    const composedImgs = await page.evaluate(() => {
      // Find all <img>s whose inline filter has >= 2 url() refs.
      return Array.from(document.querySelectorAll('img'))
        .map(img => img.style.filter)
        .filter(f => (f.match(/url\(/g) || []).length >= 2);
    });
    expect(composedImgs.length).toBeGreaterThanOrEqual(1);
    const sepiaPlusBlur = composedImgs.find(f => /sepia/.test(f) && /blur/.test(f));
    expect(sepiaPlusBlur).toBeTruthy();
    // sepia url() ref comes before blur url() ref (CSS filter applies L→R).
    const sepiaIdx = sepiaPlusBlur.indexOf('shader-sepia');
    const blurIdx = sepiaPlusBlur.indexOf('shader-blur');
    expect(sepiaIdx).toBeLessThan(blurIdx);
  });

  test('Text + shader path also works (descriptor chainable, not class)', async ({ page }) => {
    // The "Hello" / "Blur" / "Drop" Text views at the bottom each carry
    // a shader filter — verify at least one Text element has filter set.
    const textsWithFilter = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('span'))
        .filter(s => s.style.filter && s.style.filter.includes('#swfw-shader-'))
        .map(s => ({ text: s.textContent, filter: s.style.filter }));
    });
    expect(textsWithFilter.length).toBeGreaterThanOrEqual(1);
  });

  test('no duplicate filter ids (reuse works across views)', async ({ page }) => {
    const idCounts = await page.evaluate(() => {
      const ids = Array.from(document.head.querySelectorAll('svg > defs > filter'))
        .map(f => f.getAttribute('id'));
      const counts = {};
      for (const id of ids) counts[id] = (counts[id] || 0) + 1;
      return counts;
    });
    for (const [id, count] of Object.entries(idCounts)) {
      expect(count, `filter id ${id} should be mounted exactly once`).toBe(1);
    }
  });
});
