#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Usage: node scripts/size.js [paths...] [--budget-gzip-kb N]
// With a budget, exit 1 when the gzipped total exceeds it (#53).
const args = process.argv.slice(2);
const budgetIndex = args.indexOf('--budget-gzip-kb');
const budgetKB = budgetIndex === -1 ? null : Number(args[budgetIndex + 1]);
if (budgetIndex !== -1 && !(budgetKB > 0)) {
  console.error('size: --budget-gzip-kb needs a positive number');
  process.exit(2);
}
const targets = budgetIndex === -1 ? args : args.filter((_, i) => i !== budgetIndex && i !== budgetIndex + 1);

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

  if (budgetKB !== null) {
    const usedKB = gzipTotal / 1024;
    if (usedKB > budgetKB) {
      console.error(`Size budget exceeded: ${usedKB.toFixed(1)} KB gzipped > ${budgetKB} KB budget`);
      process.exit(1);
    }
    console.log(`Size budget: ${usedKB.toFixed(1)} KB of ${budgetKB} KB gzipped`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
