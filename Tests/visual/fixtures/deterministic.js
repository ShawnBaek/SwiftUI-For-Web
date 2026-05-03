// Deterministic init script injected into every visual-test page before any
// example code runs. Removes sources of pixel variance (RNG, time, fonts,
// scrollbars) so screenshots are reproducible across machines / runs.

export const DETERMINISTIC_INIT = `
(() => {
  // 1. Seeded LCG for Math.random
  let _seed = 0x12345678;
  Math.random = () => {
    _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
    return _seed / 0x7fffffff;
  };

  // 2. Frozen Date (2025-01-01T00:00:00Z)
  const FROZEN = 1735689600000;
  const RealDate = Date;
  function FrozenDate(...args) {
    if (!(this instanceof FrozenDate)) return new RealDate(FROZEN).toString();
    return args.length ? new RealDate(...args) : new RealDate(FROZEN);
  }
  FrozenDate.now = () => FROZEN;
  FrozenDate.UTC = RealDate.UTC;
  FrozenDate.parse = RealDate.parse;
  FrozenDate.prototype = RealDate.prototype;
  globalThis.Date = FrozenDate;

  // 3. Force a single deterministic font stack and hide scrollbars.
  //    Runs once DOM is ready so it overrides any author <style>.
  const applyStyle = () => {
    const s = document.createElement('style');
    s.id = '__visual-test-style__';
    s.textContent = \`
      * {
        font-family: Arial, sans-serif !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    \`;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStyle, { once: true });
  } else {
    applyStyle();
  }
})();
`;

// 1×1 grey PNG (deterministic placeholder for all external images)
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

// Block all external image fetches and return a deterministic 1×1 placeholder.
// Networked images (picsum.photos, randomuser.me, etc.) are the largest source
// of pixel variance across runs; this neutralizes them entirely.
export async function blockExternalImages(page) {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1|::1)/, async (route) => {
    const req = route.request();
    const type = req.resourceType();
    if (type === 'image' || type === 'media' || type === 'font') {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: PLACEHOLDER_PNG,
      });
      return;
    }
    // Allow other (e.g. scripts) — examples shouldn't fetch them, but be safe
    await route.continue();
  });
}

// Wait for the SwiftUI-For-Web app to mount and quiesce.
//   page: Playwright page
//   opts.extraSelector: optional CSS selector to wait for after mount
//   opts.expectedCount: optional number of elements expected for extraSelector
export async function waitForSwiftUIApp(page, opts = {}) {
  await page.waitForSelector('#root[data-swiftui-mounted="true"]', { timeout: 10000 });
  if (opts.extraSelector) {
    await page.waitForFunction(
      ({ sel, n }) => document.querySelectorAll(sel).length >= (n || 1),
      { sel: opts.extraSelector, n: opts.expectedCount || 1 },
      { timeout: 10000 }
    );
  }
  // Wait for any pending images to load
  await page.waitForFunction(() => {
    const imgs = Array.from(document.images);
    return imgs.every((img) => img.complete);
  }, null, { timeout: 10000 });
  // Two animation frames for layout/paint to settle.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
