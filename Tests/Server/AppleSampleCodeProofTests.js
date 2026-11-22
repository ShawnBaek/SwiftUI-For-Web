/**
 * AppleSampleCode proof case (#40). Node only.
 *
 * Renders the AppleSampleCode "Core NFC" framework collection page with
 * SwiftUI-For-Web (Examples/AppleSampleCodeProof) and compares it with the
 * page AppleSampleCode's Python renderer (_scripts/render_html_site.py)
 * generated, stored in Examples/AppleSampleCodeProof/fixtures/. The
 * comparison is on semantics, not bytes: metadata, headings, links,
 * landmarks, lists, tables and visible text word by word.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from '../TestUtils.js';
import { renderPage, loadData } from '../../Examples/AppleSampleCodeProof/render.mjs';
import { parseHTML, semantics } from '../../Examples/AppleSampleCodeProof/semantics.mjs';

const example = (file) => fileURLToPath(new URL(`../../Examples/AppleSampleCodeProof/${file}`, import.meta.url));

const pythonHTML = readFileSync(example('fixtures/python-core-nfc.html'), 'utf8');
const swiftHTML = renderPage(loadData());
const python = semantics(parseHTML(pythonHTML));
const swift = semantics(parseHTML(swiftHTML));

const json = (value) => JSON.stringify(value, null, 1);

// First differing index of two arrays, with some context, for failure output.
function firstDifference(expected, actual) {
  const length = Math.max(expected.length, actual.length);
  for (let i = 0; i < length; i++) {
    if (json(expected[i]) !== json(actual[i])) {
      return `at ${i}: python ${json(expected.slice(Math.max(0, i - 3), i + 4))} vs swiftui ${json(actual.slice(Math.max(0, i - 3), i + 4))}`;
    }
  }
  return null;
}

function expectSameSequence(name, expected, actual) {
  const difference = firstDifference(expected, actual);
  if (difference) throw new Error(`${name} differ ${difference}`);
  expect(actual.length).toBe(expected.length);
}

describe('AppleSampleCode proof: Core NFC collection page (#40)', () => {
  it('has the same title, description and canonical URL', () => {
    expect(swift.title).toBe(python.title);
    expect(swift.meta.description).toBe(python.meta.description);
    expect(swift.canonical).toBe(python.canonical);
    expect(swift.lang).toBe(python.lang);
  });

  it('has the same Open Graph and Twitter tags', () => {
    const social = (meta) => Object.fromEntries(Object.entries(meta)
      .filter(([key]) => key.startsWith('og:') || key.startsWith('twitter:'))
      .sort(([a], [b]) => a.localeCompare(b)));
    expect(json(social(swift.meta))).toBe(json(social(python.meta)));
    expect(Object.keys(social(python.meta)).length).toBe(8);
  });

  it('has the same remaining <meta> tags', () => {
    expect(json(swift.meta)).toBe(json(python.meta));
  });

  it('has the same JSON-LD content', () => {
    expect(python.jsonLD.length).toBe(1);
    expect(json(swift.jsonLD)).toBe(json(python.jsonLD));
  });

  it('has the same heading texts and levels, in order', () => {
    expectSameSequence('headings', python.headings, swift.headings);
    expect(python.headings.length).toBe(7);
  });

  it('has the same link hrefs, texts and labels, in order', () => {
    expectSameSequence('links', python.links, swift.links);
    expect(python.links.length).toBe(24);
  });

  it('resolves every in-page fragment link', () => {
    const fragments = swift.links.filter((link) => link.href.startsWith('#')).map((link) => link.href.slice(1));
    expect(fragments.length).toBeGreaterThan(0);
    for (const id of fragments) {
      if (!swift.ids.includes(id)) throw new Error(`#${id} has no target`);
    }
  });

  it('has the same landmarks, in order', () => {
    expectSameSequence('landmarks', python.landmarks, swift.landmarks);
  });

  it('has the same lists, with the same item counts', () => {
    expectSameSequence('lists', python.lists, swift.lists);
  });

  it('has the same tables: header cells and body shape', () => {
    expectSameSequence('tables', python.tables, swift.tables);
    expect(python.tables.length).toBe(4);
  });

  it('has the same visible text, word by word', () => {
    expectSameSequence('words', python.words, swift.words);
    expect(python.words.length).toBe(293);
  });

  it('matches the committed out/index.html', () => {
    expect(readFileSync(example('out/index.html'), 'utf8')).toBe(swiftHTML);
  });

  it('is deterministic', () => {
    expect(renderPage(loadData())).toBe(swiftHTML);
  });
});
