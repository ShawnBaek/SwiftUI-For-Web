#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const targets = process.argv.slice(2);

async function collect(target) {
  const info = await stat(target);
  if (info.isDirectory()) {
    const names = await readdir(target);
    const files = [];
    for (const name of names) files.push(...await collect(path.join(target, name)));
    return files;
  }
  return /\.(js|css)$/.test(target) ? [target] : [];
}

function format(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const inputs = targets.length ? targets : ['dist'];
  const files = [];
  for (const target of inputs) files.push(...await collect(target));
  files.sort();

  let rawTotal = 0;
  let gzipTotal = 0;

  console.log('File'.padEnd(48), 'Raw'.padStart(10), 'Gzip'.padStart(10));
  console.log('-'.repeat(70));

  for (const file of files) {
    const data = await readFile(file);
    const gzip = gzipSync(data);
    rawTotal += data.length;
    gzipTotal += gzip.length;
    console.log(
      path.relative(process.cwd(), file).padEnd(48),
      format(data.length).padStart(10),
      format(gzip.length).padStart(10)
    );
  }

  console.log('-'.repeat(70));
  console.log('Total'.padEnd(48), format(rawTotal).padStart(10), format(gzipTotal).padStart(10));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
