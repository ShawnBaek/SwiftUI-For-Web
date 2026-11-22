#!/usr/bin/env node
/**
 * Writes out/index.html: the AppleSampleCode "Core NFC" collection page,
 * statically rendered by SwiftUI-For-Web (#40).
 *
 *   node Examples/AppleSampleCodeProof/render.mjs
 *
 * The page loads ../client.js, which mounts the same view over this markup
 * with mount(host, { mode: 'adopt' }).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderDocument } from '../../src/server.js';
import { CollectionScene, extraHeadTags } from './views.js';

const here = (file) => fileURLToPath(new URL(file, import.meta.url));

export function loadData() {
  return JSON.parse(readFileSync(here('./core-nfc.json'), 'utf8'));
}

export function renderPage(data = loadData()) {
  return renderDocument(CollectionScene(data), {
    lang: 'en',
    head: extraHeadTags(data),
    stylesheets: ['../../../src/styles/index.css'],
    scripts: ['../client.js'],
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(here('./out/'), { recursive: true });
  writeFileSync(here('./out/index.html'), renderPage());
  console.log('Wrote', here('./out/index.html'));
}
