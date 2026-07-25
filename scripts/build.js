#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
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
  };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--entry') {
      options.entry = path.resolve(root, requireValue(argv, ++index, argument));
    } else if (argument === '--out-dir') {
      options.outDir = path.resolve(root, requireValue(argv, ++index, argument));
    } else if (argument === '--configuration') {
      options.configuration = requireValue(argv, ++index, argument);
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
  node scripts/build.js --entry <index.html> [--out-dir <directory>]

Options:
  --entry <file>            Build one application from its HTML entry
  --out-dir <directory>     Output directory (default: dist)
  --configuration release  Production configuration
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

function needsSpace(a, b) {
  if (!a || !b) return false;
  return /[$_\p{L}\p{N}]/u.test(a) && /[$_\p{L}\p{N}]/u.test(b);
}

function minifyJavaScript(source) {
  let out = '';
  let index = 0;
  let quote = null;
  let templateDepth = 0;
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
      if (quote === '`' && character === '$' && next === '{') {
        templateDepth++;
        out += next;
        index += 2;
        continue;
      }
      if (quote === '`' && character === '}' && templateDepth > 0) templateDepth--;
      if (character === quote && templateDepth === 0) quote = null;
      index++;
      continue;
    }

    if (character === '"' || character === '\'' || character === '`') {
      if (pendingSpace && needsSpace(out[out.length - 1], character)) out += ' ';
      pendingSpace = false;
      quote = character;
      out += character;
      index++;
      continue;
    }

    if (character === '/' && next === '*') {
      index = stripBlockComment(source, index);
      pendingSpace = true;
      continue;
    }

    if (character === '/' && next === '/') {
      index = source.indexOf('\n', index + 2);
      if (index === -1) break;
      pendingSpace = true;
      continue;
    }

    if (/\s/.test(character)) {
      pendingSpace = true;
      index++;
      continue;
    }

    if (pendingSpace && needsSpace(out[out.length - 1], character)) out += ' ';
    pendingSpace = false;
    out += character;
    index++;
  }

  return out.trim() + '\n';
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

function minify(source, file) {
  if (file.endsWith('.d.ts')) return source;
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
  const indexFile = path.join(srcDir, 'index.js');
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

    if (attribute) records.push(attribute);
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
    const source = await readFile(file, 'utf8');
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

async function buildApplication(entry, outDir) {
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
  for (const record of htmlAssetRecords(originalHTML)) {
    const target = resolveLocalReference(record.value, path.dirname(entry));
    if (!target) {
      externalReferences.add(record.value);
      continue;
    }
    if (!isInside(root, target) || !await exists(target)) {
      throw new Error(`Missing HTML resource "${record.value}" in ${projectRelative(entry)}`);
    }
    const { suffix } = splitReference(record.value);
    htmlReplacements.push({
      start: record.start,
      end: record.end,
      value: `./${projectRelative(target)}${suffix}`,
    });
    queue.push(target);
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

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.entry) {
    await buildApplication(options.entry, options.outDir);
  } else {
    await buildLibrary(options.outDir);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
