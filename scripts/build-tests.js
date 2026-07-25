#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

async function main() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'swiftui-for-web-build-'));
  const fixtureRoot = await mkdtemp(path.join(root, '.build-test-'));
  try {
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
