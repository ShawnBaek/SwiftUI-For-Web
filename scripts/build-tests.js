#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { minifyJavaScript } from './minify.js';

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
