#!/usr/bin/env node
import { mkdir, rm, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const outDir = path.join(root, 'dist');

const entries = [
  ['swiftui-for-web.js', './src/index.js'],
  ['swiftui-for-web.core.js', './src/core.js'],
  ['swiftui-for-web.charts.js', './src/Charts/index.js'],
];

async function walk(dir) {
  const names = await readdir(dir);
  const files = [];
  for (const name of names) {
    const fullPath = path.join(dir, name);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (/\.(js|css|d\.ts)$/.test(name)) {
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

function minify(source, file) {
  if (file.endsWith('.d.ts')) return source;

  let out = '';
  let i = 0;
  let quote = null;
  let templateDepth = 0;
  let pendingSpace = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (quote === '`' && ch === '$' && next === '{') {
        templateDepth++;
        out += next;
        i += 2;
        continue;
      }
      if (quote === '`' && ch === '}' && templateDepth > 0) templateDepth--;
      if (ch === quote && templateDepth === 0) quote = null;
      i++;
      continue;
    }

    if (ch === '"' || ch === '\'' || ch === '`') {
      if (pendingSpace && needsSpace(out.at(-1), ch)) out += ' ';
      pendingSpace = false;
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      i = stripBlockComment(source, i);
      pendingSpace = true;
      continue;
    }

    if (ch === '/' && next === '/') {
      i = source.indexOf('\n', i + 2);
      if (i === -1) break;
      pendingSpace = true;
      continue;
    }

    if (/\s/.test(ch)) {
      pendingSpace = true;
      i++;
      continue;
    }

    if (pendingSpace && needsSpace(out.at(-1), ch)) out += ' ';
    pendingSpace = false;
    out += ch;
    i++;
  }

  return out.trim() + '\n';
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, 'src'), { recursive: true });

  const files = await walk(srcDir);
  for (const file of files) {
    const rel = path.relative(root, file);
    const target = path.join(outDir, rel);
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

  console.log(`Built ${files.length} source files into dist/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
