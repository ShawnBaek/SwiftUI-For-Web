import { test, expect } from '@playwright/test';

test('Metal Shader Gallery — demo loads and animated filters register', async ({ page }) => {
  await page.goto('/Examples/MetalShaderGallery/index.html');
  await expect(page.getByText('Metal Shader Gallery', { exact: true })).toBeVisible();

  // Each animated preset embeds an <animate> child inside a filter primitive.
  // Verify at least one of each kind landed in document.head's defs.
  const animateInfo = await page.evaluate(() => {
    const animates = Array.from(document.head.querySelectorAll('svg > defs > filter animate'));
    return animates.map(a => ({
      parent: a.parentElement.tagName.toLowerCase(),
      attr: (a.getAttribute('attributeName') || '').toLowerCase(),
      dur: a.getAttribute('dur')
    }));
  });

  // Header animatedGlow + 4 HueWave hueRotates + 3 HeatShimmer ripples +
  // 3 Holographic chains + 3 NeonText effects → expect ≥15 <animate> tags.
  expect(animateInfo.length).toBeGreaterThanOrEqual(15);

  const kinds = new Set(animateInfo.map(a => `${a.parent}:${a.attr}`));
  expect(kinds.has('fecolormatrix:values'),       'hueRotate animation missing').toBeTruthy();
  expect(kinds.has('fedisplacementmap:scale'),    'ripple animation missing').toBeTruthy();
  expect(kinds.has('fegaussianblur:stddeviation'),'glow animation missing').toBeTruthy();

  await page.screenshot({ path: 'metal-shader-gallery.png', fullPage: true });
});
