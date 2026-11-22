/**
 * Page semantics for the AppleSampleCode proof (#40): a small HTML parser
 * (no dependencies) and an extractor that reads what crawlers and assistive
 * tech see in a static page, so two renderers can be compared on meaning
 * rather than bytes.
 *
 *   node Examples/AppleSampleCodeProof/semantics.mjs page.html [other.html]
 *
 * prints the visible word count of each file.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);
// Elements a start tag of the same kind implicitly closes (enough for the
// markup both renderers produce).
const SELF_NESTING_CLOSES = new Set(['p', 'li', 'tr', 'td', 'th', 'option']);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

/** Parse HTML into { type: 'element' | 'text', tag, attrs, children, parent }. */
export function parseHTML(html) {
  const root = { type: 'element', tag: '#document', attrs: {}, children: [], parent: null };
  let current = root;
  let i = 0;
  const append = (node) => {
    node.parent = current;
    current.children.push(node);
  };
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith('<!', i)) {
      i = html.indexOf('>', i) + 1;
      continue;
    }
    if (html[i] === '<' && html[i + 1] === '/') {
      const end = html.indexOf('>', i);
      const tag = html.slice(i + 2, end).trim().toLowerCase();
      // Close up to the nearest open element with this tag.
      let node = current;
      while (node && node.tag !== tag) node = node.parent;
      if (node && node.parent) current = node.parent;
      i = end + 1;
      continue;
    }
    if (html[i] === '<' && /[a-z]/i.test(html[i + 1] ?? '')) {
      const match = /^<([a-z][a-z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/i.exec(html.slice(i));
      if (!match) throw new Error(`Unparsable tag at ${i}: ${html.slice(i, i + 60)}`);
      const tag = match[1].toLowerCase();
      const attrs = {};
      for (const [, name, , dq, sq, bare] of match[2].matchAll(/([^\s"'>\/=]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
        attrs[name.toLowerCase()] = decodeEntities(dq ?? sq ?? bare ?? '');
      }
      if (SELF_NESTING_CLOSES.has(tag) && current.tag === tag) current = current.parent;
      const element = { type: 'element', tag, attrs, children: [], parent: null };
      append(element);
      i += match[0].length;
      if (VOID.has(tag) || match[3] === '/') continue;
      if (RAW_TEXT.has(tag)) {
        const end = html.toLowerCase().indexOf(`</${tag}`, i);
        const raw = html.slice(i, end);
        element.children.push({ type: 'text', text: tag === 'title' || tag === 'textarea' ? decodeEntities(raw) : raw, parent: element });
        i = html.indexOf('>', end) + 1;
        continue;
      }
      current = element;
      continue;
    }
    const next = html.indexOf('<', i + 1);
    const end = next === -1 ? html.length : next;
    append({ type: 'text', text: decodeEntities(html.slice(i, end)) });
    i = end;
  }
  return root;
}

function* walk(node) {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}

function find(root, predicate) {
  for (const node of walk(root)) if (node.type === 'element' && predicate(node)) return node;
  return null;
}

function findAll(root, predicate) {
  return [...walk(root)].filter((node) => node.type === 'element' && predicate(node));
}

const collapse = (text) => text.replace(/\s+/g, ' ').trim();

function isHidden(node) {
  if (node.type !== 'element') return false;
  if (['script', 'style', 'template', 'head'].includes(node.tag)) return true;
  if ('hidden' in node.attrs) return true;
  const classes = (node.attrs.class ?? '').split(/\s+/);
  return classes.includes('visually-hidden') || classes.includes('swiftui-visually-hidden');
}

// Text of a subtree; every element boundary separates words, so the result
// doesn't depend on whether a renderer joins inline runs with tags or spaces.
function textChunks(node, out = []) {
  if (node.type === 'text') {
    out.push(node.text);
    return out;
  }
  if (isHidden(node)) return out;
  out.push(' ');
  for (const child of node.children) textChunks(child, out);
  out.push(' ');
  return out;
}

export const textOf = (node) => collapse(textChunks(node).join(''));

const ancestors = function* (node) {
  for (let parent = node.parent; parent; parent = parent.parent) yield parent;
};

const SECTIONING = new Set(['article', 'aside', 'main', 'nav', 'section']);

function role(node, byId) {
  if (node.attrs.role) return node.attrs.role;
  switch (node.tag) {
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'aside': return 'complementary';
    case 'header':
      return [...ancestors(node)].some((parent) => SECTIONING.has(parent.tag)) ? null : 'banner';
    case 'footer':
      return [...ancestors(node)].some((parent) => SECTIONING.has(parent.tag)) ? null : 'contentinfo';
    case 'section':
      return accessibleName(node, byId) ? 'region' : null;
    case 'ul': case 'ol': return 'list';
    case 'li': return 'listitem';
    case 'table': return 'table';
    case 'tr': return 'row';
    case 'th': return 'columnheader';
    case 'td': return 'cell';
    default: return null;
  }
}

function accessibleName(node, byId) {
  if (node.attrs['aria-label']) return node.attrs['aria-label'];
  if (node.attrs['aria-labelledby']) {
    return node.attrs['aria-labelledby'].split(/\s+/).map((id) => (byId.get(id) ? textOf(byId.get(id)) : '')).join(' ').trim();
  }
  return null;
}

const LANDMARKS = new Set(['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'region', 'form']);

/** What a crawler or screen reader gets from the page. */
export function semantics(document) {
  const html = find(document, (node) => node.tag === 'html');
  const head = find(document, (node) => node.tag === 'head');
  const body = find(document, (node) => node.tag === 'body');
  const byId = new Map(findAll(body, (node) => node.attrs.id).map((node) => [node.attrs.id, node]));

  const meta = {};
  for (const node of findAll(head, (node) => node.tag === 'meta' && (node.attrs.name || node.attrs.property))) {
    meta[node.attrs.name ?? node.attrs.property] = node.attrs.content;
  }
  const sortedMeta = Object.fromEntries(Object.entries(meta).sort(([a], [b]) => a.localeCompare(b)));
  const title = find(head, (node) => node.tag === 'title');
  const canonical = find(head, (node) => node.tag === 'link' && node.attrs.rel === 'canonical');
  const jsonLD = findAll(head, (node) => node.tag === 'script' && node.attrs.type === 'application/ld+json')
    .map((node) => JSON.parse(node.children.map((child) => child.text).join('')));

  const elements = findAll(body, () => true).filter((node) => ![...ancestors(node)].some(isHidden) && !isHidden(node));
  const roleOf = (node) => role(node, byId);

  const headings = elements.filter((node) => /^h[1-6]$/.test(node.tag))
    .map((node) => ({ level: Number(node.tag[1]), text: textOf(node), id: node.attrs.id ?? null }));

  const links = elements.filter((node) => node.tag === 'a' && 'href' in node.attrs)
    .map((node) => ({ href: node.attrs.href, text: textOf(node), label: node.attrs['aria-label'] ?? null }));

  const landmarks = elements.filter((node) => LANDMARKS.has(roleOf(node)))
    .map((node) => ({ role: roleOf(node), name: accessibleName(node, byId) }));

  // Items belong to their nearest list.
  const nearest = (node, wanted) => [...ancestors(node)].find((parent) => wanted.includes(roleOf(parent)));
  const listNodes = elements.filter((node) => roleOf(node) === 'list');
  const lists = listNodes.map((list) => ({
    items: elements.filter((node) => roleOf(node) === 'listitem' && nearest(node, ['list']) === list).map(textOf),
  }));

  const tables = elements.filter((node) => roleOf(node) === 'table').map((table) => {
    const rows = elements.filter((node) => roleOf(node) === 'row' && nearest(node, ['table']) === table);
    const cells = (row, kind) => elements.filter((node) => roleOf(node) === kind && nearest(node, ['row']) === row).map(textOf);
    return {
      header: rows.flatMap((row) => cells(row, 'columnheader')),
      rows: rows.map((row) => cells(row, 'cell')).filter((row) => row.length > 0),
    };
  });

  const words = textOf(body).split(' ').filter(Boolean);

  return {
    lang: html?.attrs.lang ?? null,
    title: title ? collapse(textOf(title)) : null,
    meta: sortedMeta,
    canonical: canonical?.attrs.href ?? null,
    jsonLD,
    headings,
    links,
    landmarks,
    lists,
    tables,
    words,
    ids: [...byId.keys()],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const file of process.argv.slice(2)) {
    const result = semantics(parseHTML(readFileSync(file, 'utf8')));
    console.log(`${result.words.length} words  ${file}`);
  }
}
