#!/usr/bin/env node
/**
 * Module evaluation order check (#53). Node built-ins only.
 *
 * A page evaluates the framework's module graph from whichever module it
 * imports first. With circular imports (Renderer, View and the controls import
 * each other), a different first module changes the evaluation order, and a
 * module that reads a binding before it is initialised throws a TDZ error and
 * the page renders nothing. This check imports every module under `src/`
 * first, in a fresh module map (a worker thread), then every public entry in
 * two different orders, and fails on any error.
 *
 * Usage: node scripts/check-import-order.js
 */
import { readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = [
  'src/index.js',
  'src/core.js',
  'src/performance.js',
  'src/islands.js',
  'src/server.js',
  'src/Charts/index.js',
  'src/runtime.js',
];

async function modules(dir) {
  const found = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await modules(relative));
    else if (entry.name.endsWith('.js')) found.push(relative);
  }
  return found;
}

const workerSource = `
  const { workerData, parentPort } = require('node:worker_threads');
  (async () => {
    for (const url of workerData.urls) await import(url);
  })().then(
    () => parentPort.postMessage(null),
    (error) => parentPort.postMessage(String(error && error.stack || error)),
  );
`;

function importInFreshMap(files) {
  const urls = files.map((file) => pathToFileURL(path.join(root, file)).href);
  return new Promise((resolve) => {
    const worker = new Worker(workerSource, { eval: true, workerData: { urls } });
    worker.once('message', (error) => { worker.terminate(); resolve(error); });
    worker.once('error', (error) => resolve(String(error.stack || error)));
  });
}

async function main() {
  const all = (await modules('src')).sort();
  const orders = [];
  for (const first of all) {
    orders.push([first, ...entries]);
    orders.push([first, ...[...entries].reverse()]);
  }

  const failures = [];
  let next = 0;
  const run = async () => {
    while (next < orders.length) {
      const order = orders[next++];
      const error = await importInFreshMap(order);
      if (error) failures.push(`${order[0]} first, then ${order.slice(1).join(', ')}:\n    ${error.split('\n').slice(0, 4).join('\n    ')}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(8, os.cpus().length)) }, run));

  for (const failure of failures) console.error(`✗ ${failure}`);
  console.log(`Import order: ${all.length} modules, ${orders.length} orders, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
