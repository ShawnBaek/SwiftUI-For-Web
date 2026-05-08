/**
 * SignalRenderer smoke test (Phase 3).
 *
 * Mounts a tiny Counter directly via SignalRenderer (NOT App.mount, which
 * still uses the Reconciler). Verifies:
 *   - Initial render correct
 *   - Mutating state.value updates Text(() => state.value) without a refresh
 *   - Untracked Text stays the same
 *   - Disposer tears down DOM + stops effects
 */

import { test, expect } from '@playwright/test';

const PAGE = `
<!doctype html><html><body>
  <div id="root"></div>
  <script type="module">
    import { State } from '/src/Data/State.js';
    import { mount } from '/src/Core/SignalRenderer.js';
    import { flushSync } from '/src/Core/Scheduler.js';
    import { Text } from '/src/View/Text.js';

    // Minimal VStack-shaped descriptor wrapper so we can put two Text
    // children in one tree. We use the existing Text descriptor + a hand-
    // rolled container descriptor matching the Renderer's VStack shape.
    import { createDescriptor } from '/src/Core/ViewDescriptor.js';

    const count = new State(0);
    window.__count = count;
    window.__flush = flushSync;

    const root = createDescriptor('VStack', { spacing: 0 }, [
      Text(() => 'reactive:' + count.value),
      Text('static:hello'),
    ]);

    const dispose = mount(() => root, document.getElementById('root'));
    window.__dispose = dispose;
  </script>
</body></html>
`;

test('SignalRenderer mounts and reactively updates Text content', async ({ page }) => {
  await page.route('**/test.html', (route) => route.fulfill({ contentType: 'text/html', body: PAGE }));
  await page.goto('http://localhost:8000/test.html');
  await page.waitForFunction(() => !!window.__count);

  // Initial render
  const initial = await page.evaluate(() => document.getElementById('root').innerText);
  expect(initial).toContain('reactive:0');
  expect(initial).toContain('static:hello');

  // Reactive update — no app.refresh, no subscribe wiring
  await page.evaluate(() => { window.__count.value = 7; window.__flush(); });
  const afterWrite = await page.evaluate(() => document.getElementById('root').innerText);
  expect(afterWrite).toContain('reactive:7');
  expect(afterWrite).toContain('static:hello');

  // Multiple writes coalesce
  await page.evaluate(() => {
    window.__count.value = 10;
    window.__count.value = 11;
    window.__count.value = 12;
    window.__flush();
  });
  const afterCoalesce = await page.evaluate(() => document.getElementById('root').innerText);
  expect(afterCoalesce).toContain('reactive:12');

  // Dispose tears down DOM
  await page.evaluate(() => window.__dispose());
  const afterDispose = await page.evaluate(() => document.getElementById('root').innerHTML);
  expect(afterDispose).toBe('');

  // Writes after dispose must not throw
  await page.evaluate(() => { window.__count.value = 99; window.__flush(); });
});
