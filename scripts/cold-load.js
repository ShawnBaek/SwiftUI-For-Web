#!/usr/bin/env node
/**
 * Cold first-load check (#53). Optional and slow, so not part of validate.
 * Node built-ins and an installed Chromium-family browser only.
 *
 * Serves the repository with `serve.py` (the server the README tells people
 * to use), loads each page many times in headless Chrome with a fresh profile
 * each time, so nothing is cached, and counts the loads whose `#root` stayed
 * empty. It prints the console errors and failed requests it saw.
 *
 * Usage:
 *   node scripts/cold-load.js [--runs 20] [--wait 3000] [--url http://host:port/] [page ...]
 *
 * Without --url it starts `python3 serve.py` on a free port. Pages default to
 * Examples/HelloWorld/, Examples/TestShowcase/ and Examples/Netflix/.
 * Set BROWSER_BIN to choose the browser executable.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  const [value] = args.splice(at, 2).slice(1);
  return value;
};
const runs = Number(option('--runs', 20));
const wait = Number(option('--wait', 3000));
let base = option('--url', null);
const pages = args.length ? args : ['Examples/HelloWorld/', 'Examples/TestShowcase/', 'Examples/Netflix/'];

const candidates = [
  process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findBrowser() {
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch { /* try the next one */ }
  }
  throw new Error('No Chromium-family browser found. Set BROWSER_BIN to its executable.');
}

function freePort() {
  return new Promise((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const child = spawn('python3', ['serve.py', String(port)], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      return { child, url: `http://127.0.0.1:${port}/` };
    } catch { await sleep(50); }
  }
  child.kill();
  throw new Error('serve.py did not start');
}

/** One cold load over the DevTools protocol (--remote-debugging-pipe). */
async function coldLoad(browser, url) {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'swiftui-for-web-cold-'));
  const child = spawn(browser, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', `--user-data-dir=${profile}`, '--remote-debugging-pipe', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
  const [, , , input, output] = child.stdio;
  const pending = new Map();
  const errors = [];
  let id = 0;
  let buffer = '';
  output.on('data', (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message.result || {});
        pending.delete(message.id);
      } else if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        errors.push(`exception: ${details.exception?.description || details.text}`);
      } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(`console.error: ${message.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error'
        && !/favicon\.ico/.test(message.params.entry.url || '')) {
        errors.push(`${message.params.entry.text} ${message.params.entry.url || ''}`.trim());
      }
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    input.write(`${JSON.stringify({ id: messageId, method, params, sessionId })}\0`);
  });
  try {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    for (const domain of ['Runtime', 'Log', 'Page']) await send(`${domain}.enable`, {}, sessionId);
    await send('Page.navigate', { url }, sessionId);
    await sleep(wait);
    const { result } = await send('Runtime.evaluate', {
      expression: "(document.querySelector('#root') || document.body).innerHTML.trim().length",
      returnByValue: true,
    }, sessionId);
    return { rendered: Boolean(result?.value), errors };
  } finally {
    child.kill('SIGKILL');
    await new Promise((resolve) => child.once('close', resolve));
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  const browser = await findBrowser();
  const server = base ? null : await startServer();
  base ??= server.url;
  let blank = 0;
  try {
    for (const page of pages) {
      let pageBlank = 0;
      const seen = new Map();
      for (let i = 0; i < runs; i++) {
        const { rendered, errors } = await coldLoad(browser, new URL(page, base).href);
        if (!rendered) pageBlank++;
        for (const error of errors) seen.set(error, (seen.get(error) || 0) + 1);
      }
      blank += pageBlank;
      console.log(`${page}: ${pageBlank}/${runs} cold loads rendered nothing`);
      for (const [error, count] of seen) console.log(`  [${count}x] ${error.slice(0, 240)}`);
    }
  } finally {
    server?.child.kill();
  }
  if (blank > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
