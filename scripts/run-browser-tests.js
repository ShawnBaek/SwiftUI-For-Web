#!/usr/bin/env node
/**
 * Runs Tests/TestRunner.html in an installed Chromium-family browser, headless
 * (#53). Node built-ins only: a static file server for the repository, and the
 * browser's own `--dump-dom` to read the result the page renders.
 *
 * Usage:
 *   node scripts/run-browser-tests.js              fail if no browser is found
 *   node scripts/run-browser-tests.js --if-available   skip if no browser is found
 *   node scripts/run-browser-tests.js --bench      run the in-place update
 *                                                  benchmark (#53), real time
 *
 * Set BROWSER_BIN to choose the browser executable.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bench = process.argv.includes('--bench');
const page = bench ? 'Tests/Benchmark/updates.html' : 'Tests/TestRunner.html';
const timeoutMs = 120000;

const candidates = [
  process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

async function findBrowser() {
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch { /* try the next one */ }
  }
  return null;
}

function serve() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      // Server markup for the hydration tests (#39): a fixture from
      // Tests/App/HydrationViews.js rendered with renderToString.
      const fixture = pathname.match(/^\/__server-render\/(\w+)$/)?.[1];
      if (fixture) {
        const { renderToString } = await import(pathToFileURL(path.join(root, 'src/server.js')).href);
        const { fixtures } = await import(pathToFileURL(path.join(root, 'Tests/App/HydrationViews.js')).href);
        if (!Object.hasOwn(fixtures, fixture)) throw new Error('unknown fixture');
        response.writeHead(200, { 'Content-Type': types['.html'] });
        response.end(renderToString(fixtures[fixture]().view));
        return;
      }
      const file = path.join(root, pathname);
      if (file !== root && !file.startsWith(root + path.sep)) throw new Error('outside root');
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function dumpDom(browser, url, profile) {
  return new Promise((resolve, reject) => {
    const child = spawn(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${profile}`,
      // Virtual time lets async tests finish; the benchmark needs real time
      // (it is synchronous, so it finishes before the DOM is dumped).
      ...(bench ? [] : ['--virtual-time-budget=30000']),
      '--dump-dom',
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`browser timed out after ${timeoutMs / 1000} s`));
    }, timeoutMs);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout) reject(new Error(`browser exited with ${code}: ${stderr.slice(-2000)}`));
      else resolve(stdout);
    });
  });
}

function unescapeAttribute(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function readResult(dom) {
  const tag = dom.match(/<div id="test-output"[^>]*>/);
  if (!tag) return null;
  const attribute = (name) => {
    const match = tag[0].match(new RegExp(`data-${name}="([^"]*)"`));
    return match ? unescapeAttribute(match[1]) : null;
  };
  const total = attribute('total');
  if (total === null) return null;
  return {
    total: Number(total),
    passed: Number(attribute('passed')),
    failed: Number(attribute('failed')),
    failures: JSON.parse(attribute('failures') || '[]'),
  };
}

async function main() {
  const browser = await findBrowser();
  if (!browser) {
    const message = 'No Chromium-family browser found. Set BROWSER_BIN to its executable.';
    if (process.argv.includes('--if-available')) {
      console.log(`${message} Skipping the browser tests.`);
      return;
    }
    throw new Error(message);
  }

  const server = await serve();
  const profile = await mkdtemp(path.join(os.tmpdir(), 'swiftui-for-web-browser-'));
  try {
    const url = `http://127.0.0.1:${server.address().port}/${page}`;
    if (bench) {
      const dom = await dumpDom(browser, url, profile);
      const json = dom.match(/<pre id="bench-output">([^<]*)<\/pre>/)?.[1];
      if (!json) throw new Error(`${page} rendered no results; open it in a browser to see the error.`);
      const results = JSON.parse(unescapeAttribute(json));
      console.log(`In-place update benchmark (${path.basename(browser)}), medians in ms:`);
      for (const r of results) console.log(`  ${r.name.padEnd(30)} ${r.median.toFixed(2).padStart(8)}  (min ${r.min.toFixed(2)}, max ${r.max.toFixed(2)}, ${r.iterations} runs)`);
      return;
    }
    const result = readResult(await dumpDom(browser, url, profile));
    if (!result) {
      throw new Error(`${page} rendered no result. A test module probably failed to load; open the page in a browser to see the error.`);
    }
    for (const failure of result.failures) {
      console.error(`✗ ${failure.suite} › ${failure.test}\n    ${failure.error}`);
    }
    console.log(`Browser tests (${path.basename(browser)}): ${result.total} tests, ${result.passed} passed, ${result.failed} failed`);
    if (result.failed > 0 || result.total === 0) process.exitCode = 1;
  } finally {
    server.close();
    await rm(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
