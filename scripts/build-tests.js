#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { minifyJavaScript } from './minify.js';
import { bundleModules } from './bundle.js';

const root = process.cwd();
const builder = path.join(root, 'scripts', 'build.js');

function run(args, label) {
  const result = spawnSync(process.execPath, [builder, ...args], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(
    result.status,
    0,
    `${label} failed:\n${result.stderr || result.stdout || 'no output'}`
  );
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else files.push(file);
  }
  return files;
}

function localImports(source) {
  const imports = [];
  const pattern = /import\s*(['"])([^'"]+)\1|(?:import|export)\s*[^;]*?\bfrom\s*(['"])([^'"]+)\3|import\s*\(\s*(['"])([^'"]+)\5\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[2] || match[4] || match[6];
    if (specifier.startsWith('.')) imports.push(specifier);
  }
  return imports;
}

async function assertReachableModules(mainFile, outDir) {
  const visited = new Set();
  async function visit(file) {
    const normalized = path.normalize(file);
    if (visited.has(normalized)) return;
    visited.add(normalized);
    assert.ok(await exists(normalized), `reachable module is missing: ${path.relative(outDir, normalized)}`);
    const source = await readFile(normalized, 'utf8');
    for (const specifier of localImports(source)) {
      let target = path.resolve(path.dirname(normalized), specifier);
      if (!path.extname(target)) target += '.js';
      await visit(target);
    }
  }
  await visit(mainFile);
  return [...visited].map((file) => path.relative(outDir, file));
}

function reportValue(report, names) {
  const queue = [report];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      if (names.includes(key.toLowerCase())) return child;
      queue.push(child);
    }
  }
  return undefined;
}

async function checkSyntax(outDir) {
  const jsFiles = (await filesUnder(outDir)).filter((file) => file.endsWith('.js'));
  assert.ok(jsFiles.length > 0, 'build produced no JavaScript files');
  for (const file of jsFiles) {
    const source = await readFile(file, 'utf8');
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      encoding: 'utf8',
      input: source
    });
    assert.equal(result.status, 0, `syntax check failed for ${path.relative(outDir, file)}:\n${result.stderr}`);
  }
}

// #41: the minifier keeps strings, templates and regex literals verbatim,
// and keeps line breaks where automatic semicolon insertion needs them.
function testMinifier() {
  const cases = [
    // Regex literals containing quotes, slashes, comment markers and classes.
    ['const a = s.replace(/"/g, \'&quot;\');', 'const a=s.replace(/"/g,\'&quot;\');\n'],
    ['const b = /\\/\\/ x/.test(y); // comment', 'const b=/\\/\\/ x/.test(y);\n'],
    ['const c = /[/*]/;', 'const c=/[/*]/;\n'],
    ['return /a b/g.test(x)', 'return/a b/g.test(x)\n'],
    // Division stays division.
    ['const d = (a) / 2 / b;', 'const d=(a)/2/b;\n'],
    ['const e = i++ / 2;', 'const e=i++/2;\n'],
    // Nested templates with strings, backticks and braces.
    ['const f = `a ${x ? `in ${"q}"}` : \'}\'} b`;', 'const f=`a ${x?`in ${"q}"}`:\'}\'} b`;\n'],
    // Comment markers inside strings survive.
    ['const g = "/* not */ // kept";', 'const g="/* not */ // kept";\n'],
    // ASI: a line break between statements is kept.
    ['let h = a\n(b)', 'let h=a\n(b)\n'],
    ['x = 1\n/re/.test(y)', 'x=1\n/re/.test(y)\n'],
    // Tokens that would merge keep a space.
    ['a + +b; c - -d; let q = 1 .toString();', 'a+ +b;c- -d;let q=1 .toString();\n'],
    ['const n = 1.5e-3 + 0x1F;', 'const n=1.5e-3+0x1F;\n'],
    // A regex right after an if/while condition.
    ["if (x) / a'b/.test(s); y = (a) / 2;", "if(x)/ a'b/.test(s);y=(a)/2;\n"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(minifyJavaScript(input), expected, `minified ${JSON.stringify(input)}`);
  }
}

// #41 --bundle fixture: every import/export form, a live binding, a
// namespace import, default exports, re-exports, a cycle, name collisions
// (including a literal `p$1`), shadowing, class and function names, a
// dynamic import with a dynamic-only dependency, and import.meta.url.
const bundleFixture = {
  'index.html': '<!doctype html><script type="module" src="./main.js"></script>\n',
  'data.json': '{"ok":true}\n',
  'log.js': 'export const log = [];\n',
  'side.js': "import { log } from './log.js';\nlog.push('side');\n",
  'counter.js': `export let count = 0;
export function increment() { count += 1; return count; }
const name = 'counter';
const p = 'counter p';
export function counterName() { return name; }
export function counterP() { return p; }
export const arrow = () => 'counter arrow';
`,
  'util.js': `const name = 'util';
export function label() { return name; }
export function helper() { return 'util helper'; }
export const arrow = () => 'util arrow';
export default function () { return 'anonymous default'; }
`,
  'shapes.js': `export default class Shape { static kind = Shape.name; area() { return 0; } }
export class Square extends Shape { constructor(side) { super(); this.side = side; } area() { return this.side ** 2; } }
export const { p, q: r } = { p: 'shapes p', q: 'shapes q' };
`,
  'widget-a.js': `export class Widget { static self = Widget; static make() { return new Widget(); } }
export function helper() { return 'widget helper'; }
`,
  'widget-b.js': `import { Widget as Other } from './widget-a.js';
export class Widget { get kind() { return 'b'; } static other() { return Other.name + (Other === Widget ? ' same' : ' other'); } }
export default () => 'default arrow';
`,
  'reexport.js': `export * from './counter.js';
export { label as utilLabel, default as utilDefault } from './util.js';
export * as shapes from './shapes.js';
import { helper } from './widget-a.js';
export { helper as widgetHelper };
`,
  'cycle-a.js': `import { log } from './log.js';
import { b } from './cycle-b.js';
log.push('cycle-a');
export const a = 'a';
export function fromA() { return \`a calls \${b()}\`; }
`,
  'cycle-b.js': `import { log } from './log.js';
import { a, fromA } from './cycle-a.js';
log.push(\`cycle-b sees fromA as \${typeof fromA}\`);
let early;
try { early = a; } catch (error) { early = error.constructor.name; }
log.push(\`cycle-b reads a: \${early}\`);
export function b() { return \`b sees \${a}\`; }
`,
  'shadow.js': `import { count, increment, count as total } from './counter.js';
export function capture() { const count = 'local'; return [count, total]; }
import * as counter from './counter.js';
export function shadowedParam(count) { return count * 10; }
export function shorthand() { return { count, counter: counter.count }; }
export function blockShadow() { let result; { const increment = () => 'local'; result = increment(); } return result; }
export function catchShadow() { try { throw 7; } catch (count) { return count; } }
export function keys() { const o = { increment: 1, count: 2 }; return [o.increment, o.count, typeof increment]; }
export function nested() { var count = 'var'; function inner() { return count; } return inner(); }
export class Holder { count = count; increment() { return 'method'; } static count = 'static'; }
`,
  'lazy.js': `import { count } from './counter.js';
import { extra } from './lazy-dep.js';
export const value = \`lazy sees count \${count}\`;
export { extra };
`,
  'lazy-dep.js': "import { log } from './log.js';\nlog.push('lazy-dep');\nexport const extra = 'extra';\n",
  'main.js': `import './side.js';
import { log } from './log.js';
import { count, increment, utilLabel, utilDefault, shapes, widgetHelper, counterName, counterP } from './reexport.js';
import * as counterNamespace from './counter.js';
import Shape, { Square, p, r } from './shapes.js';
import { Widget as WidgetA, helper } from './widget-a.js';
import defaultArrow, { Widget as WidgetB } from './widget-b.js';
import { helper as utilHelper, arrow as utilArrow } from './util.js';
import { arrow as counterArrow } from './counter.js';
import { fromA } from './cycle-a.js';
import * as shadow from './shadow.js';

const name = 'main';
const p$1 = 'literal p$1';
let label = 'main label';

const rejects = (write) => { try { write(); return 'allowed'; } catch (error) { return error.constructor.name; } };

export async function run() {
  const before = count;
  increment();
  const after = count;
  const lazy = await import('./lazy.js');
  const lazyAgain = await import('./lazy.js');
  return {
    log: [...log],
    live: [before, after, counterNamespace.count],
    namespace: [Object.keys(counterNamespace), rejects(() => { counterNamespace.count = 5; }), rejects(() => { counterNamespace.extra = 1; }), counterNamespace[Symbol.toStringTag], Object.keys(shapes), shapes.default === Shape, counterNamespace.count],
    collisions: [name, counterName(), utilLabel(), label, p, r, p$1, counterP()],
    defaults: [utilDefault(), utilDefault.name, defaultArrow(), defaultArrow.name, Shape.name, Shape.kind, new Square(3).area(), new Square(1) instanceof Shape],
    classes: [WidgetA.name, WidgetB.name, WidgetA.self === WidgetA, WidgetA.make() instanceof WidgetA, new WidgetB().kind, new WidgetA().constructor.name, WidgetB.other()],
    functions: [helper(), helper.name, utilHelper(), utilHelper.name, widgetHelper === helper, utilArrow.name, counterArrow.name, utilArrow(), counterArrow()],
    cycle: fromA(),
    shadow: [shadow.capture(), shadow.shadowedParam(2), shadow.shorthand(), shadow.blockShadow(), shadow.catchShadow(), shadow.keys(), shadow.nested(), new shadow.Holder().count, shadow.Holder.count, new shadow.Holder().increment()],
    dynamic: [lazy.value, lazy.extra, lazy === lazyAgain, rejects(() => { lazy.value = 1; }), Object.keys(lazy)],
    // --hash renames data.json to data.<hash>.json and rewrites the URL.
    meta: [new URL('./data.json', import.meta.url).pathname.split('/').pop().replace(/\\.[0-9a-f]{10}\\./, '.'), import.meta.url.endsWith('/main.js')],
  };
}
export { count as liveCount };
`,
};

// Import a module in a fresh Node process, call its run() and return the
// JSON of the result together with its exported names.
function runModule(file) {
  const script = `const m = await import(${JSON.stringify(pathToFileURL(file).href)});
const result = await m.run();
// The bundle also exports _$-prefixed bindings for its chunks.
console.log(JSON.stringify({ exports: Object.keys(m).filter((name) => !name.startsWith('_$')), liveCount: m.liveCount, result }));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, `running ${file} failed:\n${result.stderr}`);
  return result.stdout;
}

async function readTree(dir) {
  const files = {};
  for (const file of (await filesUnder(dir)).sort()) files[path.relative(dir, file)] = await readFile(file, 'utf8');
  return files;
}

async function testBundle(tempRoot, fixtureRoot) {
  // HelloWorld and Netflix: one bundle, no other module, index.html loads it.
  for (const example of ['HelloWorld', 'Netflix']) {
    const out = path.join(tempRoot, `${example}-bundle`);
    run(['--entry', `Examples/${example}/index.html`, '--out-dir', out, '--bundle'], `${example} bundle build`);
    const emittedJS = (await filesUnder(out)).filter((file) => file.endsWith('.js')).map((file) => path.relative(out, file));
    assert.deepEqual(emittedJS, ['bundle.js'], `${example}: expected only bundle.js, got ${emittedJS.join(', ')}`);
    const html = await readFile(path.join(out, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
    assert.deepEqual(scripts, ['./bundle.js'], `${example}: index.html does not load the bundle`);
    for (const [, href] of html.matchAll(/rel="modulepreload" href="([^"]+)"/g)) {
      assert.ok(await exists(path.join(out, href)), `${example}: modulepreload of a missing file ${href}`);
    }
    const report = JSON.parse(await readFile(path.join(out, 'build-report.json'), 'utf8'));
    assert.equal(report.bundle.file, 'bundle.js');
    assert.deepEqual(report.bundle.chunks, []);
    assert.ok(report.bundle.modules.includes(`Examples/${example}/main.js`) && report.bundle.modules.includes('src/runtime.js'), `${example}: report lacks bundled modules`);
    assert.ok(report.retainedFiles.includes('src/Core/Renderer.js'), `${example}: bundled modules are not reported as retained`);
    assert.deepEqual(report.outputFiles.map(({ file }) => file).filter((file) => file.endsWith('.js')), ['bundle.js']);
    assert.equal(report.sizes.raw, report.outputFiles.reduce((sum, { raw }) => sum + raw, 0));
    await checkSyntax(out);
  }

  // Deterministic: building twice gives byte-identical output, also hashed.
  const first = path.join(tempRoot, 'HelloWorld-bundle');
  const second = path.join(tempRoot, 'HelloWorld-bundle-again');
  run(['--entry', 'Examples/HelloWorld/index.html', '--out-dir', second, '--bundle'], 'second bundle build');
  assert.deepEqual(await readTree(second), await readTree(first), 'bundle output is not deterministic');
  const hashed = path.join(tempRoot, 'HelloWorld-bundle-hashed');
  const hashedAgain = path.join(tempRoot, 'HelloWorld-bundle-hashed-again');
  run(['--entry', 'Examples/HelloWorld/index.html', '--out-dir', hashed, '--bundle', '--hash'], 'hashed bundle build');
  run(['--entry', 'Examples/HelloWorld/index.html', '--out-dir', hashedAgain, '--bundle', '--hash'], 'second hashed bundle build');
  assert.deepEqual(await readTree(hashedAgain), await readTree(hashed), 'hashed bundle output is not deterministic');
  const hashedManifest = JSON.parse(await readFile(path.join(hashed, 'manifest.json'), 'utf8'));
  assert.match(hashedManifest['bundle.js'], /^bundle\.[0-9a-f]{10}\.js$/, 'bundle.js was not content-hashed');
  assert.ok((await readFile(path.join(hashed, 'index.html'), 'utf8')).includes(`src="./${hashedManifest['bundle.js']}"`), 'index.html does not load the hashed bundle');
  assert.equal(JSON.parse(await readFile(path.join(hashed, 'build-report.json'), 'utf8')).bundle.file, hashedManifest['bundle.js']);

  // The fixture app: the bundle (and its chunk) must compute exactly what
  // the unbundled modules compute.
  const app = path.join(fixtureRoot, 'bundle-app');
  await mkdir(app, { recursive: true });
  for (const [name, content] of Object.entries(bundleFixture)) await writeFile(path.join(app, name), content);
  const expected = runModule(path.join(app, 'main.js'));
  const parsed = JSON.parse(expected);
  assert.deepEqual(parsed.result.live, [0, 1, 1], 'fixture sanity: live binding');
  assert.equal(parsed.result.log[2], 'cycle-b reads a: ReferenceError', 'fixture sanity: cycle TDZ');
  const entry = path.relative(root, path.join(app, 'index.html'));
  for (const extra of [[], ['--no-minify'], ['--hash']]) {
    const out = path.join(tempRoot, `bundle-app${extra.join('')}`);
    run(['--entry', entry, '--out-dir', out, '--bundle', ...extra], `fixture bundle build ${extra.join(' ')}`);
    await writeFile(path.join(out, 'package.json'), '{ "type": "module" }\n');
    const report = JSON.parse(await readFile(path.join(out, 'build-report.json'), 'utf8'));
    assert.equal(report.bundle.chunks.length, 1, 'expected one dynamic chunk');
    const prefix = path.relative(root, app).split(path.sep).join('/');
    assert.deepEqual(report.bundle.chunks[0].modules, [`${prefix}/lazy-dep.js`, `${prefix}/lazy.js`]);
    assert.ok(report.bundle.renamedBindings >= 6, 'expected the colliding bindings to be renamed');
    const emittedJS = (await filesUnder(out)).filter((file) => file.endsWith('.js')).map((file) => path.relative(out, file)).sort();
    assert.deepEqual(emittedJS, [report.bundle.chunks[0].file, report.bundle.file].sort(), 'expected one bundle plus one chunk');
    assert.equal(runModule(path.join(out, report.bundle.file)), expected, `bundled fixture ${extra.join(' ')} differs from the unbundled modules`);
    await checkSyntax(out);
  }
  const fixtureFirst = path.join(tempRoot, 'bundle-app');
  const fixtureAgain = path.join(tempRoot, 'bundle-app-again');
  run(['--entry', entry, '--out-dir', fixtureAgain, '--bundle'], 'second fixture bundle build');
  await writeFile(path.join(fixtureAgain, 'package.json'), '{ "type": "module" }\n');
  assert.deepEqual(await readTree(fixtureAgain), await readTree(fixtureFirst), 'fixture bundle is not deterministic');

  // The unit suite, bundled: run-tests.js loads the framework only through
  // import(), so every module lands in a chunk. Rename every top-level
  // binding to stress the scope analysis, minify, and run it. Only the
  // tests that assert a stack frame names run-tests.js may fail.
  const suiteOut = path.join(tempRoot, 'bundled-suite');
  await mkdir(suiteOut, { recursive: true });
  const idFile = (id) => id.split('\0')[0];
  const suite = await bundleModules({
    entries: [path.join(root, 'run-tests.js')],
    load: (id) => readFile(idFile(id), 'utf8'),
    resolve: async (specifier, importer) => {
      if (!specifier.startsWith('.')) return null;
      const [pathname, query] = specifier.split('?');
      const file = path.resolve(path.dirname(idFile(importer)), pathname);
      return query ? `${file}\0?${query}` : file;
    },
    relative: (id) => path.relative(root, idFile(id)).split(path.sep).join('/') + (id.split('\0')[1] || ''),
    renameAll: true,
  });
  assert.ok(suite.files.length > 1 && suite.renamed > 300, 'the bundled suite should be split into chunks with renamed bindings');
  for (const file of suite.files) await writeFile(path.join(suiteOut, file.name), minifyJavaScript(file.code));
  await writeFile(path.join(suiteOut, 'package.json'), '{ "type": "module" }\n');
  const unbundled = spawnSync(process.execPath, ['run-tests.js'], { cwd: root, encoding: 'utf8' });
  const bundled = spawnSync(process.execPath, ['bundle.js'], { cwd: suiteOut, encoding: 'utf8' });
  const tally = (output) => {
    const match = output.match(/Results: (\d+) passed, (\d+) failed/);
    assert.ok(match, `no test summary in:\n${output.slice(-2000)}`);
    return { passed: Number(match[1]), failed: Number(match[2]), failures: [...output.matchAll(/✗ (.+)/g)].map((m) => m[1]) };
  };
  const before = tally(unbundled.stdout);
  const after = tally(bundled.stdout + bundled.stderr);
  assert.equal(before.failed, 0, 'the unbundled unit suite fails');
  assert.equal(after.passed + after.failed, before.passed, 'the bundled suite ran a different number of tests');
  const unexpected = after.failures.filter((name) => !/creation site|per call site/.test(name));
  assert.deepEqual(unexpected, [], 'bundled unit tests failed');
}

async function main() {
  testMinifier();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'swiftui-for-web-build-'));
  const fixtureRoot = await mkdtemp(path.join(root, '.build-test-'));
  try {
    // Gate (#41): the optimized library passes the same unit tests as the
    // source. run-tests.js imports ./src/..., so run a copy inside the build.
    const libraryOut = path.join(tempRoot, 'library');
    run(['--out-dir', libraryOut], 'library build');
    await writeFile(path.join(libraryOut, 'run-tests.js'), await readFile(path.join(root, 'run-tests.js'), 'utf8'));
    await writeFile(path.join(libraryOut, 'package.json'), '{ "type": "module" }\n');
    const unit = spawnSync(process.execPath, ['run-tests.js'], { cwd: libraryOut, encoding: 'utf8' });
    assert.equal(unit.status, 0, `unit tests failed against the optimized build:\n${(unit.stdout + unit.stderr).split('\n').filter((line) => line.includes('✗') || line.includes('Error')).slice(0, 20).join('\n')}`);

    // #41: --hash renames files by content, rewrites references, preloads
    // the static module graph and writes a manifest; the result is stable.
    const hashedOut = path.join(tempRoot, 'hello-world-hashed');
    run(['--entry', 'Examples/HelloWorld/index.html', '--out-dir', hashedOut, '--hash'], 'hashed entry build');
    const manifest = JSON.parse(await readFile(path.join(hashedOut, 'manifest.json'), 'utf8'));
    const hashedMain = manifest['Examples/HelloWorld/main.js'];
    assert.match(hashedMain, /^Examples\/HelloWorld\/main\.[0-9a-f]{10}\.js$/, 'main.js was not content-hashed');
    const hashedHTML = await readFile(path.join(hashedOut, 'index.html'), 'utf8');
    assert.ok(hashedHTML.includes(`src="./${hashedMain}"`), 'index.html does not load the hashed main module');
    assert.ok(/<link rel="modulepreload" href="\.\/src\/[^"]+\.[0-9a-f]{10}\.js">/.test(hashedHTML), 'no modulepreload hints for the module graph');
    const hashedReachable = await assertReachableModules(path.join(hashedOut, hashedMain), hashedOut);
    assert.ok(hashedReachable.every((file) => /\.[0-9a-f]{10}\.js$/.test(file)), 'a reachable module kept its unhashed name');
    assert.ok(!(await exists(path.join(hashedOut, 'Examples/HelloWorld/main.js'))), 'the unhashed main.js was left behind');
    const hashedAgain = path.join(tempRoot, 'hello-world-hashed-again');
    run(['--entry', 'Examples/HelloWorld/index.html', '--out-dir', hashedAgain, '--hash'], 'second hashed entry build');
    assert.deepEqual(JSON.parse(await readFile(path.join(hashedAgain, 'manifest.json'), 'utf8')), manifest, 'hashed names are not deterministic');

    const appOut = path.join(tempRoot, 'hello-world');
    run(['--entry', 'Examples/HelloWorld/index.html', '--out-dir', appOut], 'entry build');

    const index = path.join(appOut, 'index.html');
    assert.ok(await exists(index), 'entry build did not produce index.html');
    const html = await readFile(index, 'utf8');
    const moduleScript = [...html.matchAll(/<script\b[^>]*>/gi)].find(([tag]) =>
      /\btype=["']module["']/i.test(tag)
    );
    const mainMatch = moduleScript?.[0].match(/\bsrc=["']([^"']+)["']/i);
    assert.ok(mainMatch, 'output index.html has no module script');
    const mainFile = path.resolve(appOut, mainMatch[1]);
    assert.ok(await exists(mainFile), 'HelloWorld main module is missing');

    const reachable = await assertReachableModules(mainFile, appOut);
    assert.ok(reachable.some((file) => /(?:^|\/)src\/runtime\.js$/.test(file)), 'framework runtime module is not reachable');
    assert.ok(!reachable.some((file) => /(?:^|\/)src\/index\.js$/.test(file)), 'full framework entry should be tree-shaken');
    assert.ok(reachable.some((file) => /(?:^|\/)src\/Core\/Renderer\.js$/.test(file)), 'required renderer module is not reachable');
    const emitted = (await filesUnder(appOut)).map((file) => path.relative(appOut, file));
    assert.ok(!emitted.some((file) => /(?:^|\/)Charts\/Chart\.js$/.test(file)), 'unused Charts/Chart.js was emitted');
    assert.ok(!emitted.some((file) => /(?:^|\/)Graphic\/Shader\.js$/.test(file)), 'unused Graphic/Shader.js was emitted');

    const reportPath = path.join(appOut, 'build-report.json');
    assert.ok(await exists(reportPath), 'entry build did not produce build-report.json');
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const retained = reportValue(report, ['retained', 'retainedfiles']);
    const removed = reportValue(report, ['removed', 'removedfiles']);
    const raw = reportValue(report, ['raw', 'rawbytes', 'rawtotal']);
    const gzip = reportValue(report, ['gzip', 'gzipbytes', 'gzipped', 'gziptotal']);
    assert.ok(Array.isArray(retained) && retained.length > 0, 'build report lacks retained files');
    assert.ok(Array.isArray(removed) && removed.length > 0, 'build report lacks removed files');
    assert.ok(Number.isFinite(raw) && raw >= 0, 'build report lacks raw total');
    assert.ok(Number.isFinite(gzip) && gzip >= 0, 'build report lacks gzip total');
    await checkSyntax(appOut);

    // Netflix's multiline import contains comments with semicolons. It guards
    // the statement scanner against treating comment punctuation as syntax.
    const netflixOut = path.join(tempRoot, 'netflix');
    run(['--entry', 'Examples/Netflix/index.html', '--out-dir', netflixOut], 'Netflix entry build');
    const netflixMain = path.join(netflixOut, 'Examples', 'Netflix', 'main.js');
    const netflixSource = await readFile(netflixMain, 'utf8');
    assert.ok(!netflixSource.includes("from'../../src/index.js'"), 'Netflix public imports were not optimized');
    assert.ok(netflixSource.includes("from'../../src/App/App.js'"), 'Netflix App route is missing');
    const netflixReachable = await assertReachableModules(netflixMain, netflixOut);
    assert.ok(netflixReachable.some((file) => /(?:^|\/)src\/Animation\/Animation\.js$/.test(file)), 'used animation module is missing');
    assert.ok(!netflixReachable.some((file) => /(?:^|\/)src\/Charts\/Chart\.js$/.test(file)), 'unused chart module is reachable');
    const netflixReport = JSON.parse(await readFile(path.join(netflixOut, 'build-report.json'), 'utf8'));
    assert.ok(netflixReport.optimizedPublicImports > 0, 'Netflix report did not record optimized imports');

    // Default namespace imports are a deliberate conservative fallback.
    const chartsOut = path.join(tempRoot, 'charts-default');
    run(['--entry', 'Examples/Charts/index.html', '--out-dir', chartsOut], 'default import build');
    const chartsReport = JSON.parse(await readFile(path.join(chartsOut, 'build-report.json'), 'utf8'));
    assert.ok(chartsReport.retainedFiles.includes('src/index.js'), 'default import did not retain the public entry');
    assert.ok(chartsReport.retainedFiles.includes('src/Charts/Chart.js'), 'default import did not retain Charts');
    assert.equal(chartsReport.optimizedPublicImports, 0, 'default import was unsafely optimized');

    // CSS whitespace can be semantic: `.parent .child` is a descendant
    // selector, while `.parent.child` targets one element with both classes.
    await writeFile(
      path.join(fixtureRoot, 'index.html'),
      '<!doctype html><link rel="stylesheet" href="./style.css">\n'
    );
    await writeFile(
      path.join(fixtureRoot, 'style.css'),
      '.parent   .child { color: red; }\n'
    );
    const cssOut = path.join(tempRoot, 'css');
    run(
      ['--entry', path.relative(root, path.join(fixtureRoot, 'index.html')), '--out-dir', cssOut],
      'CSS entry build'
    );
    const outputCSS = await readFile(
      path.join(cssOut, path.relative(root, fixtureRoot), 'style.css'),
      'utf8'
    );
    assert.equal(outputCSS, '.parent .child{color:red;}\n', 'CSS minification changed selector semantics');

    // #41: --hash rewrites plain relative (url(img/x)), new URL('x', ...)
    // and attribute-order-independent module script references.
    const hashFixture = path.join(fixtureRoot, 'hash-app');
    await mkdir(path.join(hashFixture, 'img'), { recursive: true });
    await writeFile(path.join(hashFixture, 'index.html'),
      '<!doctype html><link rel="stylesheet" href="style.css"><script src="main.js" type="module"></script>\n');
    await writeFile(path.join(hashFixture, 'style.css'), 'body { background: url(img/bg.png); }\n');
    await writeFile(path.join(hashFixture, 'main.js'),
      "import './dep.js';\nexport const data = new URL('data.json', import.meta.url);\n");
    await writeFile(path.join(hashFixture, 'dep.js'), `import '/${path.relative(root, hashFixture).split(path.sep).join('/')}/rootdep.js';\nexport const dep = 1;\n`);
    await writeFile(path.join(hashFixture, 'rootdep.js'), 'export const rootdep = 1;\n');
    await writeFile(path.join(hashFixture, 'data.json'), '{"ok":true}\n');
    await writeFile(path.join(hashFixture, 'img', 'bg.png'), Buffer.from([137, 80, 78, 71]));
    const hashFixtureOut = path.join(tempRoot, 'hash-app');
    run(['--entry', path.relative(root, path.join(hashFixture, 'index.html')), '--out-dir', hashFixtureOut, '--hash'], 'hashed fixture build');
    const fixtureManifest = JSON.parse(await readFile(path.join(hashFixtureOut, 'manifest.json'), 'utf8'));
    const prefix = path.relative(root, hashFixture).split(path.sep).join('/');
    const hashedOf = (name) => fixtureManifest[`${prefix}/${name}`];
    const hashedCSS = await readFile(path.join(hashFixtureOut, hashedOf('style.css')), 'utf8');
    assert.ok(hashedCSS.includes(path.basename(hashedOf('img/bg.png'))), 'url(img/bg.png) was not rewritten to the hashed image');
    const hashedMainJS = await readFile(path.join(hashFixtureOut, hashedOf('main.js')), 'utf8');
    assert.ok(hashedMainJS.includes(path.basename(hashedOf('data.json'))), "new URL('data.json') was not rewritten");
    assert.ok(hashedMainJS.includes(path.basename(hashedOf('dep.js'))), 'the import of dep.js was not rewritten');
    const fixtureHTML = await readFile(path.join(hashFixtureOut, 'index.html'), 'utf8');
    assert.ok(fixtureHTML.includes(`rel="modulepreload" href="./${hashedOf('dep.js')}"`), 'no modulepreload when src comes before type');
    assert.ok(fixtureHTML.includes(`rel="modulepreload" href="./${hashedOf('rootdep.js')}"`), 'no modulepreload for a root-relative import');

    await testBundle(tempRoot, fixtureRoot);

    // Library mode must remain usable without reading or deleting repository dist/.
    run(['--out-dir', path.join(tempRoot, 'library')], 'library build');
    console.log('build tests passed');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`build tests failed: ${error.message}`);
  process.exitCode = 1;
});
