#!/usr/bin/env node
/**
 * Package checks (#47, invariant I8). Node built-ins only.
 *
 * 1. Every entry in package.json `exports` resolves and loads, through the
 *    package name, exactly as a consumer would import it.
 * 2. `./src/*` is not importable; internals are reachable only through the
 *    unstable `./internal/*` subpath.
 * 3. Each entry's default namespace and its named exports list the same names.
 * 4. `./core` exports exactly what `.` exports minus the `./charts` exports.
 * 5. Each entry's declarations (`src/index.d.ts`, `src/core.d.ts`, the Charts
 *    declarations) and its runtime agree: every declared value exists at
 *    runtime, every declared class member exists on the runtime class, and no
 *    runtime export is undeclared unless it is listed in
 *    `scripts/types-baseline.json` (a list that may only shrink).
 * 6. `sideEffects` lists every module that patches a prototype when imported.
 * 7. Every entry imports in plain Node, with no browser globals (#49).
 *
 * Usage: node scripts/check-package.js
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let checks = 0;

function check(condition, message) {
  checks++;
  if (!condition) failures.push(message);
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
}

const sorted = (names) => [...names].sort();
const difference = (a, b) => sorted([...a].filter((name) => !b.has(name)));

// ---------------------------------------------------------------------------
// .d.ts parsing (declarations only; this is not a TypeScript parser)
// ---------------------------------------------------------------------------

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * @returns {{ values: Map<string, string>, classes: Map<string, {instance: Set<string>, statics: Set<string>}>, reexports: string[] }}
 */
function parseDeclarations(source) {
  const text = stripComments(source);
  const values = new Map();
  const classes = new Map();
  const reexports = [];

  for (const match of text.matchAll(/^export\s+\*\s+from\s+['"]([^'"]+)['"]/gm)) {
    reexports.push(match[1]);
  }
  for (const match of text.matchAll(/^export\s+(?:declare\s+)?(function|const|class|enum|namespace)\s+([A-Za-z_$][\w$]*)/gm)) {
    values.set(match[2], match[1]);
  }
  // `declare const X` / `declare function X` exported later through `export { X }`.
  const declared = new Map();
  for (const match of text.matchAll(/^declare\s+(function|const|class|enum|namespace)\s+([A-Za-z_$][\w$]*)/gm)) {
    declared.set(match[2], match[1]);
  }
  for (const match of text.matchAll(/^export\s+\{([^}]*)\}\s*;?\s*$/gm)) {
    for (const part of match[1].split(',')) {
      const [local, exported] = part.trim().split(/\s+as\s+/);
      if (!local || local.startsWith('type ')) continue;
      if (declared.has(local)) values.set(exported || local, declared.get(local));
    }
  }

  for (const match of text.matchAll(/^export\s+(?:declare\s+)?class\s+([A-Za-z_$][\w$]*)[^{]*\{/gm)) {
    const name = match[1];
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    while (index < text.length && depth > 0) {
      const char = text[index++];
      if (char === '{') depth++;
      else if (char === '}') depth--;
    }
    const body = text.slice(start, index - 1);
    const instance = new Set();
    const statics = new Set();
    let level = 0;
    for (const line of body.split('\n')) {
      if (level === 0) {
        const member = line.match(/^\s*(static\s+)?(?:readonly\s+)?(get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*(\(|<|\?|:)/);
        if (member && member[3] !== 'constructor') {
          const isMethod = member[4] === '(' || member[4] === '<' || Boolean(member[2]);
          if (member[1]) statics.add(member[3]);
          else if (isMethod) instance.add(member[3]);
        }
      }
      for (const char of line) {
        if (char === '{' || char === '(') level++;
        else if (char === '}' || char === ')') level--;
      }
    }
    classes.set(name, { instance, statics });
  }
  return { values, classes, reexports };
}

async function loadDeclarations(file, seen = new Set()) {
  if (seen.has(file)) return { values: new Map(), classes: new Map() };
  seen.add(file);
  const parsed = parseDeclarations(await readFile(file, 'utf8'));
  for (const specifier of parsed.reexports) {
    let target = path.resolve(path.dirname(file), specifier);
    if (target.endsWith('.js')) target = target.slice(0, -3) + '.d.ts';
    else if (!target.endsWith('.d.ts')) target += '.d.ts';
    check(await exists(target), `${path.relative(root, file)} re-exports a missing file: ${specifier}`);
    if (!await exists(target)) continue;
    const nested = await loadDeclarations(target, seen);
    for (const [name, kind] of nested.values) if (!parsed.values.has(name)) parsed.values.set(name, kind);
    for (const [name, members] of nested.classes) if (!parsed.classes.has(name)) parsed.classes.set(name, members);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function main() {
  // No browser globals are installed: every entry must import in plain Node
  // (#49). A failure here means an import-time read of window or document.
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const entries = Object.entries(pkg.exports);

  // 1. Every entry loads through the package name.
  const loaded = new Map();
  for (const [subpath, target] of entries) {
    if (subpath.includes('*') || typeof target === 'string') continue;
    const specifier = pkg.name + subpath.slice(1);
    for (const condition of ['import', 'default', 'types']) {
      check(
        typeof target[condition] === 'string' && await exists(path.join(root, target[condition])),
        `exports["${subpath}"].${condition} does not point at a file: ${target[condition]}`
      );
    }
    try {
      loaded.set(subpath, await import(specifier));
      check(true);
    } catch (error) {
      check(false, `import('${specifier}') failed: ${error.message}`);
    }
  }
  check(typeof pkg.main === 'string' && await exists(path.join(root, pkg.main)), `"main" does not point at a file: ${pkg.main}`);
  check(typeof pkg.types === 'string' && await exists(path.join(root, pkg.types)), `"types" does not point at a file: ${pkg.types}`);

  // 2. Internals are not public API.
  check(!('./src/*' in pkg.exports), 'exports must not contain "./src/*"; internals belong under "./internal/*"');
  let srcResolved = false;
  try {
    import.meta.resolve(`${pkg.name}/src/index.js`);
    srcResolved = true;
  } catch { /* expected: ERR_PACKAGE_PATH_NOT_EXPORTED */ }
  check(!srcResolved, `'${pkg.name}/src/index.js' must not resolve`);
  for (const specifier of [`${pkg.name}/internal/Core/Scheduler.js`, `${pkg.name}/styles/base.css`]) {
    let resolved = null;
    try {
      resolved = fileURLToPath(import.meta.resolve(specifier));
    } catch { /* reported below */ }
    check(resolved !== null && await exists(resolved), `'${specifier}' does not resolve to a file`);
  }

  // 3. Default namespace and named exports agree. The `extend*` installers
  //    are named-only: runtime.js calls them, and apps never do.
  const namedOnly = (name) => /^extend[A-Z]/.test(name);
  for (const [subpath, module] of loaded) {
    // The default export of ./charts is the curated `Charts` namespace.
    if (subpath === './charts') continue;
    const named = new Set(Object.keys(module).filter((name) => name !== 'default'));
    if (!module.default) continue;
    const inDefault = new Set(Object.keys(module.default));
    const missingFromDefault = difference(named, inDefault).filter((name) => !namedOnly(name));
    const missingFromNamed = difference(inDefault, named);
    check(missingFromDefault.length === 0, `"${subpath}": named exports missing from the default namespace: ${missingFromDefault.join(', ')}`);
    check(missingFromNamed.length === 0, `"${subpath}": default namespace members with no named export: ${missingFromNamed.join(', ')}`);
    const different = sorted(inDefault).filter((name) => named.has(name) && module.default[name] !== module[name]);
    check(different.length === 0, `"${subpath}": default namespace and named export differ for: ${different.join(', ')}`);
  }

  // 4. ./core is the full entry without ./charts.
  const full = loaded.get('.');
  const core = loaded.get('./core');
  const charts = loaded.get('./charts');
  if (full && core && charts) {
    const names = (module) => new Set(Object.keys(module).filter((name) => name !== 'default'));
    const fullNames = names(full);
    const coreNames = names(core);
    const chartNames = names(charts);
    const expectedCore = new Set([...fullNames].filter((name) => !chartNames.has(name)));
    check(difference(expectedCore, coreNames).length === 0, `"./core" is missing exports of ".": ${difference(expectedCore, coreNames).join(', ')}`);
    check(difference(coreNames, expectedCore).length === 0, `"./core" has exports that "." lacks, or that belong to "./charts": ${difference(coreNames, expectedCore).join(', ')}`);
    check(difference(chartNames, fullNames).length === 0, `"." is missing "./charts" exports: ${difference(chartNames, fullNames).join(', ')}`);
    const diverged = sorted(coreNames).filter((name) => fullNames.has(name) && core[name] !== full[name]);
    check(diverged.length === 0, `"./core" and "." export different values for: ${diverged.join(', ')}`);
  }

  // 5. Declarations agree with the runtime.
  const baseline = JSON.parse(await readFile(path.join(root, 'scripts', 'types-baseline.json'), 'utf8'));
  const declarationTargets = [['.', full], ['./core', core], ['./charts', charts]];
  for (const [subpath, module] of declarationTargets) {
    if (!module) continue;
    const file = path.join(root, pkg.exports[subpath].types);
    const declarations = await loadDeclarations(file);
    const label = path.relative(root, file);
    const runtime = new Set(Object.keys(module).filter((name) => name !== 'default'));
    const declared = new Set(declarations.values.keys());

    const phantom = difference(declared, runtime);
    check(phantom.length === 0, `${label} declares values the runtime does not export: ${phantom.join(', ')}`);

    const allowed = new Set(baseline.untyped[subpath] || []);
    const untyped = difference(runtime, declared);
    const unexpected = untyped.filter((name) => !allowed.has(name));
    check(unexpected.length === 0, `${label} has no declaration for runtime exports: ${unexpected.join(', ')}`);
    const stale = sorted(allowed).filter((name) => declared.has(name) || !runtime.has(name));
    check(stale.length === 0, `scripts/types-baseline.json lists names that are now typed or gone (remove them): ${stale.join(', ')}`);

    const descriptorOnly = baseline.descriptorOnlyMembers || {};
    for (const [name, members] of declarations.classes) {
      const value = module[name];
      // Only real classes can be checked: a factory function (Chart, the
      // marks) hides the class whose instances carry the members.
      if (typeof value !== 'function' || !/^class\b/.test(Function.prototype.toString.call(value))) continue;
      for (const member of descriptorOnly[name] || []) members.instance.delete(member);
      const missingStatics = sorted(members.statics).filter((member) => !(member in value));
      check(missingStatics.length === 0, `${label}: ${name} declares static members the runtime lacks: ${missingStatics.join(', ')}`);
      if (!value.prototype) continue;
      const missing = sorted(members.instance).filter((member) => !(member in value.prototype));
      check(missing.length === 0, `${label}: ${name} declares members the runtime lacks: ${missing.join(', ')}`);
    }
  }

  // 6. sideEffects covers every module that patches a prototype on import.
  const sideEffects = (pkg.sideEffects || []).map((entry) => entry.replace(/^\.\//, ''));
  const dead = new Set(['src/Core/Chainable.js', 'src/Core/ViewFactory.js', 'src/Core/index.js']);
  for (const file of await walk(path.join(root, 'src'))) {
    if (!file.endsWith('.js')) continue;
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (dead.has(relative)) continue;
    const source = await readFile(file, 'utf8');
    const patches = /^[A-Za-z_$][\w$]*\.prototype\.[A-Za-z_$][\w$]*\s*=/m.test(source)
      || /^extend[A-Z]\w*\(/m.test(source);
    if (patches) {
      check(sideEffects.includes(relative), `package.json "sideEffects" must list ${relative} (it patches a prototype when imported)`);
    }
  }
  for (const entry of sideEffects) {
    if (entry.includes('*')) continue;
    check(await exists(path.join(root, entry)), `package.json "sideEffects" lists a missing file: ${entry}`);
  }

  if (failures.length > 0) {
    console.error(`package checks failed (${failures.length} of ${checks}):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`package checks passed (${checks} checks)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
