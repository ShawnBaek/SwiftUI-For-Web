/**
 * Static rendering tests (#40). Node only (reads snapshot files).
 *
 * Snapshots live in Tests/Server/__snapshots__. To accept new output after
 * an intentional change: UPDATE_SNAPSHOTS=1 node scripts/run-node-suites.js
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../TestUtils.js';
import {
  VStack, HStack, Text, Button, Spacer, Toggle, State, Color, Font,
  List, NavigationStack, NavigationLink, TabView, Picker, PickerStyle,
  WindowGroup, Divider,
} from '../../src/index.js';
import { renderToString, renderDocument, DocumentMetadata, sitemap, serializeJSONLD } from '../../src/server.js';
import { getLifecycleStats } from '../../src/Core/LifecycleObserver.js';

const snapshotDir = fileURLToPath(new URL('./__snapshots__/', import.meta.url));

function matchSnapshot(name, actual) {
  const file = `${snapshotDir}${name}.html`;
  if (process.env.UPDATE_SNAPSHOTS === '1' || !existsSync(file)) {
    writeFileSync(file, actual);
    if (process.env.UPDATE_SNAPSHOTS !== '1') throw new Error(`Snapshot ${name} was missing and has been written; run again`);
    return;
  }
  expect(actual).toBe(readFileSync(file, 'utf8'));
}

const views = {
  'text-and-modifiers': () => VStack({ alignment: 'leading', spacing: 12 },
    Text('Hello, <SwiftUI> & "web"').font(Font.largeTitle).foregroundColor(Color.blue),
    Text('Padded').padding(16).background(Color.gray).cornerRadius(8),
    Divider(),
    Text('Framed').frame({ width: 120, height: 40 }),
  ),
  controls: () => HStack(
    Button('Tap me', () => {}),
    Spacer(),
    Toggle('Notifications', new State(true).binding),
  ),
  'segmented-picker': () => Picker('Flavor', new State('b').binding,
    Text('A').tag('a'), Text('B').tag('b')).pickerStyle(PickerStyle.segmented),
  'list-selection': () => List(
    [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }],
    { selection: new State(2).binding },
    (item) => Text(item.name),
  ),
  // #42: representative modifiers.
  'accessibility-modifiers': () => VStack(
    Text('42').accessibilityLabel('Answer').accessibilityValue('forty-two').accessibilityHint('The answer')
      .accessibilityIdentifier('answer'),
  ),
  'searchable-and-sheet': () => VStack(Text('Results'))
    .searchable(new State('swift').binding, { prompt: 'Search samples' })
    .sheet(new State(false).binding, () => Text('Sheet content')),
  'ordered-modifiers': () => VStack(
    Text('outside').background(Color.blue).padding(8),
    Text('stacked').padding(8).padding({ top: 4 }),
    Text('same').padding(8).background(Color.gray).cornerRadius(4).opacity(0.5),
  ),
  'navigation-and-tabs': () => VStack(
    NavigationStack(VStack(Text('Home'), NavigationLink('Details', () => Text('Detail')))),
    TabView(new State(0), Text('First'), Text('Second')),
  ),
};

describe('renderToString (#40)', () => {
  for (const [name, factory] of Object.entries(views)) {
    it(`matches the ${name} snapshot`, () => {
      matchSnapshot(name, renderToString(factory));
    });
  }

  it('is deterministic: the same view renders byte-identical HTML, ids included', () => {
    for (const factory of Object.values(views)) {
      expect(renderToString(factory)).toBe(renderToString(factory));
    }
    const html = renderToString(views.controls);
    expect(html.includes('aria-labelledby="swiftui-toggle-label-1"')).toBe(true);
  });

  it('escapes text content and attribute values', () => {
    const html = renderToString(() => VStack(Text('</span><script>alert(1)</script>'), Text('a & b')));
    expect(html.includes('<script>')).toBe(false);
    expect(html.includes('&lt;/span&gt;&lt;script&gt;alert(1)&lt;/script&gt;')).toBe(true);
    expect(html.includes('a &amp; b')).toBe(true);
  });

  it('runs without a browser and restores the globals it installs', () => {
    expect(typeof globalThis.document).toBe('undefined');
    renderToString(() => Text('x'));
    expect(typeof globalThis.document).toBe('undefined');
    expect(typeof globalThis.window).toBe('undefined');
    expect(typeof globalThis.HTMLElement).toBe('undefined');
  });

  it('keeps nothing registered after a render and never runs onAppear or onDisappear', () => {
    let calls = 0;
    for (let i = 0; i < 100; i++) {
      renderToString(() => VStack(Text('hi').onAppear(() => calls++).onDisappear(() => calls++)));
    }
    const stats = getLifecycleStats();
    expect(stats.pendingAppear).toBe(0);
    expect(stats.pendingDisappear).toBe(0);
    expect(stats.observerActive).toBe(false);
    expect(calls).toBe(0);
  });

  it('restores the globals when the render throws', () => {
    expect(() => renderToString(() => { throw new Error('boom'); })).toThrow('boom');
    expect(typeof globalThis.document).toBe('undefined');
    expect(typeof globalThis.window).toBe('undefined');
  });

  it('containers keep a view descriptor given as their first argument', async () => {
    const { ScrollView, LazyVStack, LazyHStack, Form, ViewThatFits } = await import('../../src/index.js');
    for (const container of [ScrollView, LazyVStack, LazyHStack, Form]) {
      const html = renderToString(() => container(VStack(Text('inside'))));
      expect(html.includes('inside')).toBe(true);
    }
    // ViewThatFits needs layout to pick a child (empty in a static render),
    // but it must keep the descriptor as a candidate.
    expect(ViewThatFits(VStack(Text('inside'))).children.length).toBe(1);
    expect(renderToString(() => WindowGroup(VStack(Text('scene')))).includes('scene')).toBe(true);
  });

  it('accepts a descriptor, a factory and a legacy View', () => {
    expect(renderToString(Text('a'))).toBe(renderToString(() => Text('a')));
    expect(renderToString(Toggle('x', new State(false).binding)).startsWith('<')).toBe(true);
  });
});

describe('DocumentMetadata (#40)', () => {
  const metadata = new DocumentMetadata({
    title: 'Learn </title><script>x</script> & more',
    description: 'Quotes " and <tags>',
    canonical: 'https://example.org/a?b=1&c=2',
    robots: { index: true, follow: false },
    openGraph: { type: 'website', image: 'https://example.org/og.png', siteName: 'Site "One"' },
    twitter: { card: 'summary_large_image' },
    jsonLD: { '@context': 'https://schema.org', '@type': 'WebSite', name: '</script><!-- & \u2028' },
  });

  it('escapes every value in the head tags', () => {
    const head = metadata.headHTML();
    expect(head.includes('<title>Learn &lt;/title&gt;&lt;script&gt;x&lt;/script&gt; &amp; more</title>')).toBe(true);
    expect(head.includes('content="Quotes &quot; and &lt;tags&gt;"')).toBe(true);
    expect(head.includes('href="https://example.org/a?b=1&amp;c=2"')).toBe(true);
    expect(head.includes('content="Site &quot;One&quot;"')).toBe(true);
    expect(head.includes('content="index, nofollow"')).toBe(true);
    // JSON-LD can't close its script element or open a comment.
    const script = head.slice(head.indexOf('<script type="application/ld+json">'));
    expect(script.indexOf('</script>')).toBe(script.length - '</script>'.length);
    expect(script.includes('<!--')).toBe(false);
    expect(script.includes('\\u003c/script\\u003e\\u003c!-- \\u0026 \\u2028')).toBe(true);
    expect(JSON.parse(serializeJSONLD({ a: '</script>' })).a).toBe('</script>');
  });

  it('falls back to the title and description for Open Graph', () => {
    const head = new DocumentMetadata({ title: 'T', description: 'D', canonical: 'https://e.org/', openGraph: {} }).headHTML();
    expect(head.includes('<meta property="og:title" content="T">')).toBe(true);
    expect(head.includes('<meta property="og:description" content="D">')).toBe(true);
    expect(head.includes('<meta property="og:url" content="https://e.org/">')).toBe(true);
  });

  it('rejects URLs that are not absolute http(s) and invalid robots directives', () => {
    expect(() => new DocumentMetadata({ canonical: '/relative' })).toThrow('absolute http(s) URL');
    expect(() => new DocumentMetadata({ canonical: 'javascript:alert(1)' })).toThrow('absolute http(s) URL');
    expect(() => new DocumentMetadata({ openGraph: { image: 'data:x' } })).toThrow('absolute http(s) URL');
    expect(() => new DocumentMetadata({ robots: 'noindex"><script>' })).toThrow('invalid robots directive');
  });

  it('renders a full document from a WindowGroup with metadata (snapshot)', () => {
    const scene = WindowGroup({ title: 'Scene title', metadata }, () => VStack(Text('Body copy')));
    const html = renderDocument(scene, { stylesheets: ['/styles/index.css?v=1&x=2'], scripts: ['/main.js'] });
    matchSnapshot('document', html);
    expect(renderDocument(scene, { stylesheets: ['/styles/index.css?v=1&x=2'], scripts: ['/main.js'] })).toBe(html);
  });

  it('uses the WindowGroup title when the metadata has none', () => {
    const html = renderDocument(WindowGroup('Only a title', () => Text('x')));
    expect(html.includes('<title>Only a title</title>')).toBe(true);
  });
});

describe('sitemap (#40)', () => {
  it('writes escaped, validated sitemap XML', () => {
    const xml = sitemap([
      '/',
      { path: '/search?q=a&b', lastModified: '2026-11-01T10:00:00Z', changeFrequency: 'weekly', priority: 0.8 },
    ], { baseURL: 'https://example.org' });
    matchSnapshot('sitemap', xml);
    expect(xml.includes('<loc>https://example.org/search?q=a&amp;b</loc>')).toBe(true);
    expect(() => sitemap(['/x'], {})).toThrow('absolute http(s) URL');
    expect(() => sitemap([{ path: '/', changeFrequency: 'often' }], { baseURL: 'https://e.org' })).toThrow('changeFrequency');
    expect(() => sitemap([{ path: '/', priority: 2 }], { baseURL: 'https://e.org' })).toThrow('priority');
  });
});
