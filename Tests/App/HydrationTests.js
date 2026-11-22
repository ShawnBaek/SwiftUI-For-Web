/**
 * Hydration tests (#39): mount(host, { mode: 'adopt' }) reuses the server's
 * DOM nodes. The server markup comes from renderToString, run in Node by the
 * browser runner, and is set as the host's innerHTML.
 */

import { describe, it, expect } from '../TestUtils.js';
import { App } from '../../src/App/App.js';
import { flushSync } from '../../src/Core/Scheduler.js';
import { flushLifecycleCallbacks } from '../../src/Core/LifecycleObserver.js';
import { fixtures } from './HydrationViews.js';

// The browser runner (scripts/run-browser-tests.js) renders the fixture with
// renderToString in Node, as a server would, at /__server-render/<name>.
async function serverHTML(name) {
  const response = await fetch(`/__server-render/${name}`);
  if (!response.ok) throw new Error(`/__server-render/${name}: ${response.status}. Run these tests with npm run test:browser.`);
  return response.text();
}

// Server markup as a page would deliver it: with whitespace and a comment
// around the root.
async function serverHost(name) {
  const host = document.createElement('div');
  host.innerHTML = `\n  <!-- server-rendered -->\n  ${await serverHTML(name)}\n`;
  document.body.appendChild(host);
  return host;
}

// Tags, text and attributes, without generated ids and the attributes that
// reference them (counters differ between renders).
const GENERATED = new Set(['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls']);
function shape(node) {
  if (node.nodeType === 3) return node.data.trim() ? `"${node.data.trim()}"` : '';
  if (node.nodeType !== 1) return '';
  // A pooled element can keep an empty style attribute.
  const attributes = node.getAttributeNames()
    .filter((name) => !GENERATED.has(name) && !(name === 'style' && !node.getAttribute(name))).sort()
    .map((name) => `${name}=${node.getAttribute(name)}`).join(' ');
  return `<${node.localName} ${attributes}>${Array.from(node.childNodes, shape).join('')}</${node.localName}>`;
}

function captureWarnings(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => { warnings.push(args.join(' ')); };
  try {
    return { result: fn(), warnings };
  } finally {
    console.warn = original;
  }
}

describe('Hydration (adopt mode, #39)', () => {
  it('reuses every server element and keeps the client markup', async () => {
    const host = await serverHost('counter');
    const before = Array.from(host.querySelectorAll('*'));
    const root = host.firstElementChild;
    const { warnings } = captureWarnings(() => {
      const fixture = fixtures.counter();
      host._app = App(fixture.view).mount(host, { mode: 'adopt' });
    });
    expect(warnings.filter((w) => w.includes('adopt'))).toEqual([]);
    expect(host.firstElementChild).toBe(root);
    expect(host.childNodes.length).toBe(1);
    const after = Array.from(host.querySelectorAll('*'));
    expect(after.length).toBe(before.length);
    expect(before.every((element) => element.isConnected && host.contains(element))).toBe(true);
    // Same nodes in the same places.
    expect(after.every((element, i) => element === before[i])).toBe(true);

    // The markup equals a fresh client render.
    const fresh = document.createElement('div');
    document.body.appendChild(fresh);
    const freshApp = App(fixtures.counter().view).mount(fresh);
    expect(shape(host.firstElementChild)).toBe(shape(fresh.firstElementChild));
    freshApp.unmount();
    fresh.remove();
    host._app.unmount();
    host.remove();
  });

  it('binds handlers and effects to the reused nodes', async () => {
    const host = await serverHost('counter');
    const button = host.querySelector('button');
    const countText = Array.from(host.querySelectorAll('span')).find((span) => span.textContent === 'Count: 0');
    const input = host.querySelector('input:not([type="checkbox"])');
    const greeting = Array.from(host.querySelectorAll('span')).find((span) => span.textContent === 'Hello, Ada');
    expect(Boolean(countText && input && greeting)).toBe(true);

    const fixture = fixtures.counter();
    const app = App(fixture.view).mount(host, { mode: 'adopt' });
    expect(host.querySelector('button')).toBe(button);

    button.click();
    button.click();
    flushSync();
    expect(fixture.taps()).toBe(2);
    expect(fixture.count.value).toBe(2);
    expect(countText.isConnected).toBe(true);
    expect(countText.textContent).toBe('Count: 2');

    input.value = 'Grace';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();
    expect(fixture.name.value).toBe('Grace');
    expect(greeting.textContent).toBe('Hello, Grace');

    greeting.click();
    flushSync();
    expect(countText.textContent).toBe('Count: 12');

    fixture.name.value = 'Linus';
    flushSync();
    expect(input.value).toBe('Linus');

    const checkbox = host.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.click();
      flushSync();
      expect(fixture.on.value).toBe(true);
    }

    app.unmount();
    button.click();
    flushSync();
    expect(fixture.taps()).toBe(2);
    host.remove();
  });

  it('runs onAppear once for the adopted tree', async () => {
    const host = await serverHost('counter');
    const fixture = fixtures.counter();
    let appeared = 0;
    const app = App(() => fixture.view().onAppear(() => { appeared++; })).mount(host, { mode: 'adopt' });
    flushLifecycleCallbacks();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appeared).toBe(1);
    app.unmount();
    host.remove();
  });

  it('keeps focus and the selection on the same field', async () => {
    const host = await serverHost('counter');
    const input = host.querySelector('input:not([type="checkbox"])');
    input.focus();
    input.setSelectionRange(1, 2);
    expect(document.activeElement).toBe(input);

    const app = App(fixtures.counter().view).mount(host, { mode: 'adopt' });
    expect(host.querySelector('input:not([type="checkbox"])')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 2]);
    app.unmount();
    host.remove();
  });

  it('recovers from a mismatched subtree', async () => {
    const host = await serverHost('mismatchServer');
    const root = host.firstElementChild;
    const title = root.querySelector('span');
    const addButton = root.querySelector('button');
    const total = Array.from(root.querySelectorAll('span')).find((span) => span.textContent === 'Total: 0');

    const fixture = fixtures.mismatchClient();
    const { result: app, warnings } = captureWarnings(() => App(fixture.view).mount(host, { mode: 'adopt' }));
    expect(warnings.some((w) => w.includes("mode: 'adopt'") && w.includes('differs'))).toBe(true);

    // Matching nodes around the mismatch are still reused.
    expect(host.firstElementChild).toBe(root);
    expect(title.isConnected && title.textContent === 'Title').toBe(true);
    expect(total.isConnected).toBe(true);
    expect(addButton.isConnected && addButton.textContent === 'Add').toBe(true);

    // The DOM is the client's tree.
    const fresh = document.createElement('div');
    document.body.appendChild(fresh);
    const freshApp = App(fixtures.mismatchClient().view).mount(fresh);
    expect(shape(host.firstElementChild)).toBe(shape(fresh.firstElementChild));
    freshApp.unmount();
    fresh.remove();

    const buttons = Array.from(host.querySelectorAll('button'));
    buttons.find((button) => button.textContent === 'Add').click();
    flushSync();
    expect(fixture.count.value).toBe(1);
    expect(total.textContent).toBe('Total: 1');
    app.unmount();
    host.remove();
  });

  it('replace mode still swaps in new nodes', async () => {
    const host = await serverHost('counter');
    const root = host.firstElementChild;
    const app = App(fixtures.counter().view).mount(host, { mode: 'replace' });
    expect(host.firstElementChild === root).toBe(false);
    expect(root.isConnected).toBe(false);
    app.unmount();
    host.remove();
  });
});
