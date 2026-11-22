#!/usr/bin/env node
import { minifyJavaScript } from './minify.js';
import { bundleModules } from './bundle.js';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdir, rm, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

const entries = [
  ['swiftui-for-web.js', './src/index.js'],
  ['swiftui-for-web.core.js', './src/core.js'],
  ['swiftui-for-web.charts.js', './src/Charts/index.js'],
];

function parseArguments(argv) {
  const options = {
    entry: null,
    outDir: path.join(root, 'dist'),
    configuration: 'release',
    minify: true,
    hash: false,
    bundle: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--entry') {
      options.entry = path.resolve(root, requireValue(argv, ++index, argument));
    } else if (argument === '--out-dir') {
      options.outDir = path.resolve(root, requireValue(argv, ++index, argument));
    } else if (argument === '--configuration') {
      options.configuration = requireValue(argv, ++index, argument);
    } else if (argument === '--no-minify') {
      options.minify = false;
    } else if (argument === '--hash') {
      options.hash = true;
    } else if (argument === '--bundle') {
      options.bundle = true;
    } else if (argument === '--help' || argument === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown build option: ${argument}`);
    }
  }

  if (options.configuration !== 'release') {
    throw new Error('Only --configuration release is currently supported');
  }

  if (options.bundle && !options.entry) {
    throw new Error('--bundle requires --entry');
  }

  assertSafeOutputDirectory(options.outDir);
  if (options.entry && !isInside(root, options.entry)) {
    throw new Error('--entry must be inside the repository');
  }

  return options;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`SwiftUI-For-Web release builder

Usage:
  node scripts/build.js
  node scripts/build.js --entry <index.html> [--out-dir <directory>] [--bundle] [--hash]

Options:
  --entry <file>            Build one application from its HTML entry
  --out-dir <directory>     Output directory (default: dist)
  --configuration release  Production configuration
  --no-minify               Keep files unminified (still tree-shaken)
  --hash                    Content-hash file names (application builds)
                            and write manifest.json
  --bundle                  Scope-hoist the page's module scripts and their
                            static imports into one ES module, bundle.js
                            (bundle.<hash>.js with --hash); modules reached
                            only by import('…') become chunk-*.js files
  --help                    Show this help`);
}

function assertSafeOutputDirectory(outDir) {
  const filesystemRoot = path.parse(outDir).root;
  if (outDir === filesystemRoot || outDir === root || isInside(outDir, root)) {
    throw new Error(`Refusing unsafe output directory: ${outDir}`);
  }

  if (isInside(root, outDir)) {
    const [topLevelDirectory] = path.relative(root, outDir).split(path.sep);
    if (topLevelDirectory !== 'dist') {
      throw new Error('In-repository --out-dir must be dist or a directory inside dist');
    }
  }
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function toPosix(file) {
  return file.split(path.sep).join('/');
}

function projectRelative(file) {
  if (!isInside(root, file)) {
    throw new Error(`Referenced file is outside the repository: ${file}`);
  }
  return toPosix(path.relative(root, file));
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, predicate = () => true) {
  const names = await readdir(dir);
  const files = [];
  for (const name of names) {
    const fullPath = path.join(dir, name);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      files.push(...await walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripBlockComment(input, start) {
  const end = input.indexOf('*/', start + 2);
  return end === -1 ? input.length : end + 2;
}

function minifyCSS(source) {
  let out = '';
  let index = 0;
  let quote = null;
  let pendingSpace = false;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      out += character;
      if (character === '\\') {
        out += next ?? '';
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index++;
      continue;
    }

    if (character === '"' || character === '\'') {
      if (pendingSpace && keepCSSSpace(out[out.length - 1], character)) out += ' ';
      pendingSpace = false;
      quote = character;
      out += character;
      index++;
      continue;
    }

    if (character === '/' && next === '*') {
      index = stripBlockComment(source, index);
      continue;
    }

    if (/\s/.test(character)) {
      pendingSpace = true;
      index++;
      continue;
    }

    if (pendingSpace && keepCSSSpace(out[out.length - 1], character)) out += ' ';
    pendingSpace = false;
    out += character;
    index++;
  }

  return out.trim() + '\n';
}

function keepCSSSpace(previous, next) {
  if (!previous || !next) return false;
  const structural = /[{}:;,>]/;
  return !structural.test(previous) && !structural.test(next);
}

let minifyEnabled = true;

function minify(source, file) {
  if (file.endsWith('.d.ts') || !minifyEnabled) return source;
  return file.endsWith('.css')
    ? minifyCSS(source)
    : minifyJavaScript(source);
}

function findStatementEnd(source, start) {
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index++) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index++;
      }
      continue;
    }
    if (quote) {
      if (character === '\\') {
        index++;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '/' && next === '/') {
      lineComment = true;
      index++;
    } else if (character === '/' && next === '*') {
      blockComment = true;
      index++;
    } else if (character === '"' || character === '\'') {
      quote = character;
    } else if (character === ';') {
      return index + 1;
    }
  }

  return source.length;
}

function maskComments(source) {
  let masked = '';
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        masked += '\n';
      } else {
        masked += ' ';
      }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        masked += '  ';
        blockComment = false;
        index++;
      } else {
        masked += character === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (quote) {
      masked += character;
      if (character === '\\') {
        masked += next ?? '';
        index++;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '/' && next === '/') {
      masked += '  ';
      lineComment = true;
      index++;
    } else if (character === '/' && next === '*') {
      masked += '  ';
      blockComment = true;
      index++;
    } else {
      masked += character;
      if (character === '"' || character === '\'') quote = character;
    }
  }

  return masked;
}

function scanStaticModules(source) {
  const records = [];
  const linePattern = /(^|\n)([ \t]*)(import|export)\b/g;
  let match;

  while ((match = linePattern.exec(source))) {
    const start = match.index + match[1].length + match[2].length;
    const keyword = match[3];
    const afterKeyword = start + keyword.length;
    const nextNonSpace = source.slice(afterKeyword).search(/\S/);
    if (nextNonSpace === -1) continue;
    const nextCharacter = source[afterKeyword + nextNonSpace];
    if (keyword === 'import' && (nextCharacter === '(' || nextCharacter === '.')) continue;
    if (keyword === 'export' && nextCharacter !== '{' && nextCharacter !== '*') continue;

    const end = findStatementEnd(source, afterKeyword);
    const statement = source.slice(start, end);
    const maskedStatement = maskComments(statement);
    const sideEffect = maskedStatement.match(/^import\s*(['"])([^'"]+)\1/);
    const from = maskedStatement.match(/\bfrom\s*(['"])([^'"]+)\1/);
    const specifier = sideEffect?.[2] ?? from?.[2];
    if (!specifier) continue;

    records.push({
      start,
      end,
      keyword,
      statement,
      specifier,
      clause: from
        ? maskedStatement.slice(keyword.length, from.index).trim()
        : '',
    });
    linePattern.lastIndex = end;
  }

  const maskedSource = maskComments(source);
  const dynamicPattern = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  while ((match = dynamicPattern.exec(maskedSource))) {
    records.push({
      start: match.index,
      end: dynamicPattern.lastIndex,
      keyword: 'dynamic-import',
      statement: match[0],
      specifier: match[2],
      clause: '',
    });
  }

  return records.sort((a, b) => a.start - b.start);
}

function parseNamedImports(clause) {
  const trimmed = clause.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  const names = [];
  for (const part of trimmed.slice(1, -1).split(',')) {
    const value = part.trim();
    if (!value) continue;
    const alias = value.split(/\s+as\s+/);
    if (alias.length > 2 || !alias[0]) return null;
    names.push({
      imported: alias[0].trim(),
      local: (alias[1] || alias[0]).trim(),
    });
  }
  return names;
}

async function createPublicExportMap() {
  const indexFile = path.join(srcDir, 'exports.js');
  const source = await readFile(indexFile, 'utf8');
  const bindings = new Map();

  for (const record of scanStaticModules(source)) {
    if (record.keyword !== 'import') continue;
    const imports = parseNamedImports(record.clause);
    if (!imports) continue;
    const module = resolveLocalReference(record.specifier, path.dirname(indexFile));
    if (!module) continue;
    for (const binding of imports) {
      bindings.set(binding.local, {
        module,
        imported: binding.imported,
      });
    }
  }

  return bindings;
}

function relativeModuleSpecifier(fromFile, toFile) {
  let relative = toPosix(path.relative(path.dirname(fromFile), toFile));
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function rewritePublicImports(source, file, exportMap) {
  const publicIndex = path.join(srcDir, 'index.js');
  const runtime = path.join(srcDir, 'runtime.js');
  const replacements = [];
  let runtimeAdded = false;
  let optimizedImports = 0;

  for (const record of scanStaticModules(source)) {
    if (record.keyword !== 'import') continue;
    const target = resolveLocalReference(record.specifier, path.dirname(file));
    if (target !== publicIndex) continue;

    const imports = parseNamedImports(record.clause);
    if (!imports || imports.length === 0 || imports.some((item) => !exportMap.has(item.imported))) {
      continue;
    }

    const groups = new Map();
    for (const item of imports) {
      const route = exportMap.get(item.imported);
      if (!groups.has(route.module)) groups.set(route.module, []);
      groups.get(route.module).push({
        imported: route.imported,
        local: item.local,
      });
    }

    const statements = [];
    if (!runtimeAdded) {
      statements.push(`import '${relativeModuleSpecifier(file, runtime)}';`);
      runtimeAdded = true;
    }
    for (const [module, names] of groups) {
      const bindings = names.map(({ imported, local }) =>
        imported === local ? imported : `${imported} as ${local}`
      );
      statements.push(
        `import { ${bindings.join(', ')} } from '${relativeModuleSpecifier(file, module)}';`
      );
    }

    replacements.push({
      start: record.start,
      end: record.end,
      value: statements.join('\n'),
    });
    optimizedImports++;
  }

  let transformed = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    transformed =
      transformed.slice(0, replacement.start) +
      replacement.value +
      transformed.slice(replacement.end);
  }

  return { source: transformed, optimizedImports };
}

function splitReference(reference) {
  const suffixIndex = reference.search(/[?#]/);
  return suffixIndex === -1
    ? { pathname: reference, suffix: '' }
    : { pathname: reference.slice(0, suffixIndex), suffix: reference.slice(suffixIndex) };
}

function resolveLocalReference(reference, baseDir) {
  if (
    !reference ||
    reference.startsWith('#') ||
    reference.startsWith('//') ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(reference)
  ) {
    return null;
  }

  const { pathname } = splitReference(reference);
  const resolved = pathname.startsWith('/')
    ? path.resolve(root, `.${pathname}`)
    : path.resolve(baseDir, pathname);
  return path.normalize(resolved);
}

async function resolveModule(reference, importer) {
  const resolved = resolveLocalReference(reference, path.dirname(importer));
  if (!resolved) return null;
  if (!isInside(root, resolved)) {
    throw new Error(`Module import leaves the repository: ${reference} in ${projectRelative(importer)}`);
  }
  if (await exists(resolved)) return resolved;
  if (!path.extname(resolved) && await exists(`${resolved}.js`)) return `${resolved}.js`;
  throw new Error(`Missing module "${reference}" imported by ${projectRelative(importer)}`);
}

function htmlAssetRecords(source) {
  const records = [];
  const tagPattern = /<(script|link|img|source|video)\b[^>]*>/gi;
  let tagMatch;

  while ((tagMatch = tagPattern.exec(source))) {
    const tag = tagMatch[1].toLowerCase();
    const attributes = new Map();
    const attributePattern = /([:\w-]+)\s*=\s*(["'])(.*?)\2/g;
    let attributeMatch;
    while ((attributeMatch = attributePattern.exec(tagMatch[0]))) {
      const value = attributeMatch[3];
      const valueOffset =
        tagMatch.index + attributeMatch.index + attributeMatch[0].length - value.length - 1;
      attributes.set(attributeMatch[1].toLowerCase(), {
        value,
        start: valueOffset,
        end: valueOffset + value.length,
      });
    }

    let attribute = null;
    if (tag === 'script' && attributes.get('type')?.value.toLowerCase() === 'module') {
      attribute = attributes.get('src');
    } else if (tag === 'link') {
      const rel = attributes.get('rel')?.value.toLowerCase() || '';
      if (/(?:stylesheet|icon|manifest|modulepreload|preload)/.test(rel)) {
        attribute = attributes.get('href');
      }
    } else if (tag === 'video') {
      attribute = attributes.get('poster') || attributes.get('src');
    } else {
      attribute = attributes.get('src');
    }

    if (attribute) {
      records.push({
        ...attribute,
        tag,
        moduleScript: tag === 'script' && attribute === attributes.get('src'),
        tagStart: tagMatch.index,
        tagEnd: tagMatch.index + tagMatch[0].length,
      });
    }
  }

  return records;
}

function cssReferences(source) {
  const references = [];
  const pattern = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s]+)\1\s*\)?|url\(\s*(['"]?)([^'")]+)\3\s*\)/g;
  let match;
  while ((match = pattern.exec(source))) {
    references.push(match[2] || match[4]);
  }
  return references;
}

function staticURLReferences(source) {
  const references = [];
  const pattern = /\bnew\s+URL\s*\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g;
  let match;
  while ((match = pattern.exec(source))) references.push(match[2]);
  return references;
}

async function collectApplicationCandidates(entry, outDir) {
  const candidates = new Set(await walk(srcDir));
  const entryDirectory = path.dirname(entry);

  if (entryDirectory === root) {
    for (const directoryName of ['assets', 'public']) {
      const directory = path.join(root, directoryName);
      if (await exists(directory)) {
        for (const file of await walk(directory)) candidates.add(file);
      }
    }
  } else {
    for (const file of await walk(entryDirectory)) candidates.add(file);
  }

  return [...candidates].filter((file) => !isInside(outDir, file));
}

async function buildLibrary(outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, 'src'), { recursive: true });

  const files = await walk(srcDir, (file) => /\.(js|css|d\.ts)$/.test(file));
  for (const file of files) {
    const target = path.join(outDir, projectRelative(file));
    await mkdir(path.dirname(target), { recursive: true });
    let source = await readFile(file, 'utf8');
    // Development checks are off in the optimized build (#52).
    if (projectRelative(file) === 'src/Core/Dev.js') {
      source = source.replace('export const DEV_BUILD = true;', 'export const DEV_BUILD = false;');
    }
    await writeFile(target, minify(source, file));
  }

  for (const [fileName, importPath] of entries) {
    await writeFile(
      path.join(outDir, fileName),
      `export * from '${importPath}';\nexport { default } from '${importPath}';\n`
    );
  }

  console.log(`Built ${files.length} source files into ${toPosix(path.relative(root, outDir) || outDir)}/`);
}

async function buildApplication(entry, outDir, options = {}) {
  if (path.extname(entry).toLowerCase() !== '.html' || !await exists(entry)) {
    throw new Error(`Application entry must be an existing HTML file: ${entry}`);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const exportMap = await createPublicExportMap();
  const retained = new Set([entry]);
  const emitted = new Set();
  const externalReferences = new Set();
  const queue = [];
  let optimizedImports = 0;

  const originalHTML = await readFile(entry, 'utf8');
  const htmlReplacements = [];
  const moduleScripts = [];
  for (const record of htmlAssetRecords(originalHTML)) {
    const target = resolveLocalReference(record.value, path.dirname(entry));
    if (!target) {
      externalReferences.add(record.value);
      continue;
    }
    if (!isInside(root, target) || !await exists(target)) {
      throw new Error(`Missing HTML resource "${record.value}" in ${projectRelative(entry)}`);
    }
    if (options.bundle && record.moduleScript) {
      moduleScripts.push({ record, target });
      continue;
    }
    const { suffix } = splitReference(record.value);
    htmlReplacements.push({
      start: record.start,
      end: record.end,
      value: `./${projectRelative(target)}${suffix}`,
    });
    queue.push(target);
  }

  // #41 --bundle: one scope-hoisted module (plus dynamic chunks) replaces
  // the page's module scripts and their static module graph.
  let bundle = null;
  const bundledFiles = new Set();
  if (moduleScripts.length > 0) {
    // A module's identity is its URL: `x.js?a` and `x.js` are two instances.
    // Ids are the file, then "\0" and the query or fragment if there is one.
    const moduleId = (file, reference) => {
      const { suffix } = splitReference(reference);
      return suffix ? `${file}\0${suffix}` : file;
    };
    const idFile = (id) => id.split('\0')[0];
    const result = await bundleModules({
      entries: [...new Set(moduleScripts.map(({ record, target }) => moduleId(target, record.value)))],
      load: async (id) => {
        const file = idFile(id);
        bundledFiles.add(file);
        const rewritten = rewritePublicImports(await readFile(file, 'utf8'), file, exportMap);
        optimizedImports += rewritten.optimizedImports;
        for (const reference of staticURLReferences(rewritten.source)) {
          const dependency = resolveLocalReference(reference, path.dirname(file));
          if (dependency && await exists(dependency)) queue.push(dependency);
          else if (!dependency) externalReferences.add(reference);
        }
        return rewritten.source;
      },
      resolve: async (specifier, importer) => {
        const file = await resolveModule(specifier, idFile(importer));
        return file && moduleId(file, specifier);
      },
      relative: (id) => projectRelative(idFile(id)) + (id.split('\0')[1] || ''),
      bundleName: 'bundle.js',
    });
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    for (const file of result.files) {
      await writeFile(path.join(outDir, file.name), minify(file.code, file.name));
      emitted.add(file.name);
    }
    bundle = result;
    moduleScripts.forEach(({ record }, index) => {
      if (index === 0) {
        htmlReplacements.push({ start: record.start, end: record.end, value: './bundle.js' });
        return;
      }
      // Later module scripts are part of the bundle: drop their elements.
      const close = /<\/script\s*>/i.exec(originalHTML.slice(record.tagEnd));
      const end = close ? record.tagEnd + close.index + close[0].length : record.tagEnd;
      htmlReplacements.push({ start: record.tagStart, end, value: '' });
    });
  }

  let outputHTML = originalHTML;
  for (const replacement of htmlReplacements.sort((a, b) => b.start - a.start)) {
    outputHTML =
      outputHTML.slice(0, replacement.start) +
      replacement.value +
      outputHTML.slice(replacement.end);
  }
  await writeFile(path.join(outDir, 'index.html'), outputHTML);
  emitted.add('index.html');

  while (queue.length > 0) {
    const file = queue.shift();
    if (retained.has(file)) continue;
    retained.add(file);

    const relative = projectRelative(file);
    if (bundle?.files.some(({ name }) => name === relative)) {
      throw new Error(`${relative} would overwrite the bundle output of the same name`);
    }
    const target = path.join(outDir, relative);
    await mkdir(path.dirname(target), { recursive: true });
    const extension = path.extname(file).toLowerCase();

    if (extension === '.js') {
      const original = await readFile(file, 'utf8');
      const rewritten = rewritePublicImports(original, file, exportMap);
      optimizedImports += rewritten.optimizedImports;
      await writeFile(target, minify(rewritten.source, file));

      for (const record of scanStaticModules(rewritten.source)) {
        const dependency = await resolveModule(record.specifier, file);
        if (dependency) queue.push(dependency);
        else externalReferences.add(record.specifier);
      }
      for (const reference of staticURLReferences(rewritten.source)) {
        const dependency = resolveLocalReference(reference, path.dirname(file));
        if (dependency && await exists(dependency)) queue.push(dependency);
        else if (!dependency) externalReferences.add(reference);
      }
    } else if (extension === '.css') {
      const source = await readFile(file, 'utf8');
      await writeFile(target, minify(source, file));
      for (const reference of cssReferences(source)) {
        const dependency = resolveLocalReference(reference, path.dirname(file));
        if (!dependency) {
          externalReferences.add(reference);
        } else if (await exists(dependency)) {
          queue.push(dependency);
        } else {
          throw new Error(`Missing CSS resource "${reference}" in ${relative}`);
        }
      }
    } else {
      await writeFile(target, await readFile(file));
    }
    emitted.add(relative);
  }

  // #41: preload every module the entry's scripts import statically, so the
  // browser fetches them in parallel instead of as a waterfall.
  const nameMap = options.hash ? await hashOutputs(outDir, emitted) : null;
  await addModulePreloads(outDir, nameMap);
  if (nameMap) {
    const manifest = Object.fromEntries([...nameMap].sort(([a], [b]) => a.localeCompare(b)));
    await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (bundle) {
    for (const file of bundledFiles) retained.add(file);
  }

  const candidates = await collectApplicationCandidates(entry, outDir);
  const retainedFiles = [...retained].map(projectRelative).sort();
  const removedFiles = candidates
    .filter((file) => !retained.has(file))
    .map(projectRelative)
    .sort();

  const outputFiles = [];
  let raw = 0;
  let gzip = 0;
  for (const relative of [...emitted].sort()) {
    const data = await readFile(path.join(outDir, relative));
    const compressed = gzipSync(data);
    raw += data.length;
    gzip += compressed.length;
    outputFiles.push({
      file: relative,
      raw: data.length,
      gzip: compressed.length,
    });
  }

  const report = {
    mode: 'application',
    configuration: 'release',
    entry: projectRelative(entry),
    retainedFiles,
    removedFiles,
    externalReferences: [...externalReferences].sort(),
    optimizedPublicImports: optimizedImports,
    ...(bundle ? {
      bundle: {
        file: nameMap?.get(bundle.files[0].name) ?? bundle.files[0].name,
        modules: bundle.files[0].modules,
        chunks: bundle.files.slice(1).map((file) => ({
          file: nameMap?.get(file.name) ?? file.name,
          modules: file.modules,
        })),
        renamedBindings: bundle.renamed,
        warnings: bundle.warnings,
      },
    } : {}),
    outputFiles,
    sizes: { raw, gzip },
  };
  await writeFile(
    path.join(outDir, 'build-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(
    `Built ${report.entry}: ${retainedFiles.length} retained, ` +
    `${removedFiles.length} removed, ${formatBytes(raw)} raw, ${formatBytes(gzip)} gzip`
  );
}

// ---------------------------------------------------------------------------
// Content hashing and modulepreload (#41)
// ---------------------------------------------------------------------------

// Relative references a built file makes to other built files, with the
// [start, end) range of each quoted specifier in the source.
function localReferences(source, extension) {
  const found = [];
  // Every local reference: ./x, ../x, plain x and root-relative /x. Not
  // URLs with a scheme, protocol-relative //x, data: or fragment-only #x.
  const add = (value, start) => {
    if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//') || value.startsWith('#')) return;
    found.push({ value, start, end: start + value.length });
  };
  if (extension === '.js') {
    for (const record of scanStaticModules(source)) {
      const offset = source.indexOf(record.specifier, record.start);
      if (offset !== -1 && offset < record.end) add(record.specifier, offset);
    }
    const urlPattern = /\bnew\s+URL\s*\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g;
    let match;
    while ((match = urlPattern.exec(source))) add(match[2], match.index + match[0].indexOf(match[2]));
  } else if (extension === '.css') {
    const pattern = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s]+)\1\s*\)?|url\(\s*(['"]?)([^'")]+)\3\s*\)/g;
    let match;
    while ((match = pattern.exec(source))) {
      const value = match[2] || match[4];
      add(value, match.index + match[0].indexOf(value));
    }
  }
  return found;
}

function stripQuery(value) {
  return value.replace(/[?#].*$/, '');
}

/**
 * Rename every built file except index.html to name.<hash>.ext and rewrite
 * the references between them. A file's hash covers its own content and the
 * content of everything it reaches, so a change anywhere below renames it
 * (cycles share a hash input). Returns Map(original → hashed) of paths
 * relative to outDir.
 */
async function hashOutputs(outDir, emitted) {
  const files = [...emitted].filter((file) => file !== 'index.html');
  const sources = new Map();
  const references = new Map();
  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const data = await readFile(path.join(outDir, file));
    sources.set(file, data);
    const text = extension === '.js' || extension === '.css' ? data.toString('utf8') : null;
    const refs = text === null ? [] : localReferences(text, extension).map((ref) => ({
      ...ref,
      rootRelative: ref.value.startsWith('/'),
      target: ref.value.startsWith('/')
        ? toPosix(path.normalize(stripQuery(ref.value).slice(1)))
        : toPosix(path.join(path.dirname(file), stripQuery(ref.value))),
    })).filter((ref) => files.includes(ref.target));
    references.set(file, refs);
  }
  const ownHash = new Map(files.map((file) => [file, createHash('sha256').update(sources.get(file)).digest('hex')]));
  const reachable = (file) => {
    const seen = new Set();
    const stack = [file];
    while (stack.length) {
      const current = stack.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      for (const ref of references.get(current) || []) stack.push(ref.target);
    }
    return seen;
  };
  const nameMap = new Map();
  for (const file of files) {
    const hash = createHash('sha256');
    for (const member of [...reachable(file)].sort()) hash.update(`${member}:${ownHash.get(member)}\n`);
    const digest = hash.digest('hex').slice(0, 10);
    const extension = path.extname(file);
    nameMap.set(file, `${file.slice(0, -extension.length)}.${digest}${extension}`);
  }
  for (const file of files) {
    let data = sources.get(file);
    const refs = references.get(file);
    if (refs.length) {
      let text = data.toString('utf8');
      for (const ref of [...refs].sort((a, b) => b.start - a.start)) {
        const hashed = nameMap.get(ref.target);
        let relative = toPosix(path.relative(path.dirname(file), hashed));
        if (ref.rootRelative) relative = `/${hashed}`;
        else if (!relative.startsWith('.')) relative = `./${relative}`;
        const suffix = ref.value.slice(stripQuery(ref.value).length);
        text = text.slice(0, ref.start) + relative + suffix + text.slice(ref.end);
      }
      data = Buffer.from(text, 'utf8');
    }
    await rm(path.join(outDir, file));
    await writeFile(path.join(outDir, nameMap.get(file)), data);
    emitted.delete(file);
    emitted.add(nameMap.get(file));
  }
  // index.html references.
  const htmlFile = path.join(outDir, 'index.html');
  let html = await readFile(htmlFile, 'utf8');
  for (const record of htmlAssetRecords(html).sort((a, b) => b.start - a.start)) {
    const rootRelative = record.value.startsWith('/');
    const target = toPosix(path.normalize(stripQuery(record.value).replace(/^\//, ''))).replace(/^\.\//, '');
    if (!nameMap.has(target)) continue;
    const hashed = rootRelative ? `/${nameMap.get(target)}` : `./${nameMap.get(target)}`;
    html = html.slice(0, record.start) + hashed + record.value.slice(stripQuery(record.value).length) + html.slice(record.end);
  }
  await writeFile(htmlFile, html);
  return nameMap;
}

/**
 * Add <link rel="modulepreload"> for every module statically imported
 * (directly or not) by the page's module scripts.
 */
async function addModulePreloads(outDir, nameMap) {
  const htmlFile = path.join(outDir, 'index.html');
  let html = await readFile(htmlFile, 'utf8');
  const entries = [];
  // <script type="module" src="…">, attributes in any order.
  const tagPattern = /<script\b[^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const tag = match[0];
    if (!/\btype\s*=\s*["']module["']/i.test(tag)) continue;
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(src)) continue;
    entries.push(toPosix(path.normalize(stripQuery(src).replace(/^\//, ''))).replace(/^\.\//, ''));
  }
  const seen = new Set(entries);
  const preload = [];
  const queue = [...entries];
  while (queue.length) {
    const file = queue.shift();
    let source;
    try {
      source = await readFile(path.join(outDir, file), 'utf8');
    } catch {
      continue;
    }
    for (const record of scanStaticModules(source)) {
      if (record.keyword === 'dynamic-import') continue;
      const specifier = record.specifier;
      // Relative (./, ../) and root-relative (/x.js) imports; bare package
      // names and URLs are not part of this build.
      if (!/^\.{1,2}\//.test(specifier) && !(specifier.startsWith('/') && !specifier.startsWith('//'))) continue;
      const target = specifier.startsWith('/')
        ? toPosix(path.normalize(stripQuery(specifier).slice(1)))
        : toPosix(path.join(path.dirname(file), stripQuery(specifier)));
      if (seen.has(target)) continue;
      seen.add(target);
      preload.push(target);
      queue.push(target);
    }
  }
  if (preload.length === 0) return;
  const links = preload.sort().map((file) => `<link rel="modulepreload" href="./${file}">`).join('\n');
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${links}\n</head>`) : `${links}\n${html}`;
  await writeFile(htmlFile, html);
  void nameMap;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  minifyEnabled = options.minify;
  if (options.entry) {
    await buildApplication(options.entry, options.outDir, options);
  } else {
    await buildLibrary(options.outDir);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
