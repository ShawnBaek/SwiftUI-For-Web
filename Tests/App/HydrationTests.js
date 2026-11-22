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
import { hydrate, withoutHydration } from '../../src/Core/Hydration.js';
import { applyShaderToElement } from '../../src/Core/Renderer.js';
import { ShaderLibrary } from '../../src/Graphic/Shader.js';
import { ViewThatFits } from '../../src/Layout/ViewThatFits.js';
import { Text, Color, Stepper, State } from '../../src/index.js';

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

  it('adopting a host with a mounted app unmounts that app first', async () => {
    const host = await serverHost('counter');
    const first = fixtures.counter();
    const firstApp = App(first.view).mount(host, { mode: 'adopt' });
    const second = fixtures.counter();
    const { result: secondApp, warnings } = captureWarnings(() => App(second.view).mount(host, { mode: 'adopt' }));
    expect(warnings.some((w) => w.includes('mounted app'))).toBe(true);
    expect(warnings.filter((w) => w.includes('differs'))).toEqual([]);
    expect(host.childNodes.length).toBe(1);

    // One click reaches only the second app: the first app's direct
    // listeners (the Toggle's container click) are gone.
    host.querySelector('[role="switch"]').click();
    host.querySelector('button').click();
    flushSync();
    expect([first.on.value, first.count.value]).toEqual([false, 0]);
    expect([second.on.value, second.count.value]).toEqual([true, 1]);

    // Unmounting the replaced app leaves the host to the second one.
    firstApp.unmount();
    expect(host.dataset.swiftuiMounted).toBe('true');
    host.querySelector('button').click();
    flushSync();
    expect(second.count.value).toBe(2);
    secondApp.unmount();
    host.remove();
  });

  it('keeps text typed before hydration when the binding holds the server value', async () => {
    const host = await serverHost('counter');
    const input = host.querySelector('input:not([type="checkbox"])');
    input.value = 'Grace';
    const fixture = fixtures.counter();
    const { result: app, warnings } = captureWarnings(() => App(fixture.view).mount(host, { mode: 'adopt' }));
    expect(warnings.filter((w) => w.includes('differs'))).toEqual([]);
    expect(host.querySelector('input:not([type="checkbox"])')).toBe(input);
    expect(input.value).toBe('Grace');
    expect(fixture.name.value).toBe('Grace');
    flushSync();
    expect(host.textContent.includes('Hello, Grace')).toBe(true);
    app.unmount();
    host.remove();

    // A binding that changed before mount wins over the typed text.
    const other = await serverHost('counter');
    other.querySelector('input:not([type="checkbox"])').value = 'Grace';
    const changed = fixtures.counter();
    changed.name.value = 'Linus';
    const { result: otherApp } = captureWarnings(() => App(changed.view).mount(other, { mode: 'adopt' }));
    expect(other.querySelector('input:not([type="checkbox"])').value).toBe('Linus');
    expect(changed.name.value).toBe('Linus');
    otherApp.unmount();
    other.remove();
  });

  it('side elements made during hydration (shader defs, ViewThatFits measurement) take no server nodes', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div><span>server</span><div></div><svg><defs><filter><feColorMatrix></feColorMatrix></filter></defs></svg></div>';
    document.body.appendChild(host);
    const server = Array.from(host.querySelectorAll('*'));
    // Unique arguments, so this shader's <filter> is created now.
    const shader = ShaderLibrary.default.colorize(Color.hex(`#${(Date.now() % 0xffffff).toString(16).padStart(6, '0')}`));
    let measured = null;
    const { element, claims } = hydrate(host, () => {
      const root = document.createElement('div');
      applyShaderToElement(root, shader);
      measured = ViewThatFits(Text('measured'))._measureIdealSize(Text('measured'));
      withoutHydration(() => document.createElement('span'));
      return root;
    });
    expect(element).toBe(server[0]);
    expect(claims).toBe(1);
    expect(Boolean(measured)).toBe(true);
    const filter = document.getElementById(shader.id);
    expect(Boolean(filter) && !server.includes(filter) && !server.includes(filter.firstElementChild)).toBe(true);
    host.remove();
  });

  it('Stepper buttons at a range limit are disabled for keyboard and assistive technology', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const count = new State(3);
    const app = App(() => Stepper('Count', count.binding, { in: [0, 3] })).mount(host);
    const [minus, plus] = host.querySelectorAll('button');
    expect(plus.matches(':disabled')).toBe(true);
    expect(minus.matches(':disabled')).toBe(false);
    plus.focus();
    expect(document.activeElement === plus).toBe(false);
    plus.click();
    flushSync();
    expect(count.value).toBe(3);
    minus.click();
    flushSync();
    expect([count.value, plus.disabled]).toEqual([2, false]);
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
