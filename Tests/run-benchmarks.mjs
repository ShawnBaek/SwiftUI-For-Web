/**
 * Run SwiftUI-For-Web benchmarks in real Chromium via Playwright.
 * Usage: node Tests/run-benchmarks.mjs
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PORT = 8078;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  let filePath = join(ROOT, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(PORT, r));
console.log(`Server: http://localhost:${PORT}`);

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-gpu', '--single-process', '--no-zygote']
});
const page = await browser.newPage();

await page.goto(`http://localhost:${PORT}/Tests/TestRunner.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

console.log('\nRunning SwiftUI-For-Web benchmarks...\n');

const results = await page.evaluate(async () => {
  const { runSwiftUIBenchmarks } = await import('/Tests/Benchmark/benchmark.js');
  return await runSwiftUIBenchmarks();
});

// Print results
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        SwiftUI-For-Web Benchmark Results (Chromium)          ║');
console.log('╠════════════════════════════════════════════════════════════════╣');
console.log('');

const pad = (s, n) => s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
const fmtMs = ms => ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;

console.log(`${pad('Benchmark', 35)} ${pad('Median', 12)} ${pad('Min', 12)} ${pad('Max', 12)}`);
console.log('─'.repeat(71));

for (let i = 0; i < results.length; i++) {
  if (i === 7) {
    console.log('─'.repeat(71));
    console.log(pad(' Complex View Tree', 71));
    console.log('─'.repeat(71));
  }
  const r = results[i];
  console.log(`${pad(r.name, 35)} ${pad(fmtMs(r.median), 12)} ${pad(fmtMs(r.min), 12)} ${pad(fmtMs(r.max), 12)}`);
}

console.log('─'.repeat(71));
console.log('');

await browser.close();
server.close();
