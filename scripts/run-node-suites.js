#!/usr/bin/env node
/**
 * Runs the `Tests/**` suites that need no DOM under plain Node (#53), with the
 * same harness the browser runner uses (Tests/TestUtils.js). The suites that
 * render into a real document still run only in Tests/TestRunner.html.
 *
 * Usage: node scripts/run-node-suites.js
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Suites that import no module touching `window` or `document`. Add a suite
// here once it runs without a DOM (#49 will allow more).
const suites = [
  'Tests/Data/SignalTests.js',
  'Tests/Data/StateTests.js',
  'Tests/Data/ObservableObjectTests.js',
  'Tests/Graphic/ColorTests.js',
  'Tests/Graphic/FontTests.js',
  'Tests/Server/RenderToStringTests.js',
  'Tests/Server/AppleSampleCodeProofTests.js',
];

const load = (file) => import(pathToFileURL(path.join(root, file)).href);

async function main() {
  const { getResults, whenSettled } = await load('Tests/TestUtils.js');

  // The harness styles its browser console output with %c; drop the styles.
  const plain = (method) => {
    const original = console[method].bind(console);
    console[method] = (first, ...rest) => {
      if (typeof first !== 'string' || !first.includes('%c')) return original(first, ...rest);
      const count = first.split('%c').length - 1;
      original(first.replaceAll('%c', ''), ...rest.slice(count));
    };
  };
  for (const method of ['log', 'group', 'error']) plain(method);

  let loadFailures = 0;
  for (const suite of suites) {
    try {
      await load(suite);
      await whenSettled();
    } catch (error) {
      loadFailures++;
      console.error(`Could not load ${suite}: ${error.stack || error.message}`);
    }
  }

  const { total, passed, failed } = getResults();
  console.log(`\nNode suites: ${suites.length} files, ${total} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0 || loadFailures > 0 || total === 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
