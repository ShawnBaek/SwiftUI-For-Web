/**
 * DocumentMetadata - scene-level document metadata (#40).
 *
 * Web-only exception: SwiftUI has no document <head>. The values live at the
 * scene level (passed to WindowGroup or to renderDocument), not in view
 * modifiers. Every value is escaped when it is written out, URLs are checked,
 * and output is deterministic.
 *
 * @example
 * const metadata = new DocumentMetadata({
 *   title: 'NativeMobile',
 *   description: 'Learn native iOS development.',
 *   canonical: 'https://nativemobile.org/',
 *   openGraph: { type: 'website', image: 'https://nativemobile.org/og.png' },
 *   robots: { index: true, follow: true },
 *   jsonLD: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'NativeMobile' },
 * });
 * WindowGroup({ title: 'NativeMobile', metadata }, ContentView);
 */

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Serialize JSON-LD so it can't close the <script> element or start an HTML
 * comment: <, >, & and the JS line separators become \u escapes.
 */
export function serializeJSONLD(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function absoluteURL(value, field) {
  if (value === undefined || value === null || value === '') return null;
  let url;
  try {
    url = new URL(String(value));
  } catch {
    throw new TypeError(`DocumentMetadata: ${field} must be an absolute http(s) URL, got ${JSON.stringify(String(value))}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError(`DocumentMetadata: ${field} must be an absolute http(s) URL, got ${JSON.stringify(String(value))}`);
  }
  return url.href;
}

function optionalString(value) {
  return value === undefined || value === null || value === '' ? null : String(value);
}

const ROBOTS_DIRECTIVE = /^[a-z-]+(?::[\w-]+)?$/i;

function robotsContent(robots) {
  if (robots === undefined || robots === null) return null;
  if (typeof robots === 'string') {
    const directives = robots.split(',').map((part) => part.trim()).filter(Boolean);
    for (const directive of directives) {
      if (!ROBOTS_DIRECTIVE.test(directive)) throw new TypeError(`DocumentMetadata: invalid robots directive ${JSON.stringify(directive)}`);
    }
    return directives.join(', ') || null;
  }
  const directives = [
    robots.index === false ? 'noindex' : 'index',
    robots.follow === false ? 'nofollow' : 'follow',
  ];
  for (const extra of robots.directives ?? []) {
    if (!ROBOTS_DIRECTIVE.test(extra)) throw new TypeError(`DocumentMetadata: invalid robots directive ${JSON.stringify(extra)}`);
    directives.push(extra);
  }
  return directives.join(', ');
}

export class DocumentMetadata {
  /**
   * @param {Object} [options]
   * @param {string} [options.title]
   * @param {string} [options.description]
   * @param {string} [options.canonical] - Absolute http(s) URL
   * @param {string|{index?: boolean, follow?: boolean, directives?: string[]}} [options.robots]
   * @param {{title?: string, description?: string, type?: string, url?: string,
   *   image?: string, imageAlt?: string, siteName?: string, locale?: string}} [options.openGraph]
   * @param {{card?: string, site?: string, creator?: string}} [options.twitter]
   * @param {Object|Object[]} [options.jsonLD] - Structured data
   */
  constructor(options = {}) {
    if (options instanceof DocumentMetadata) options = options.toJSON();
    this.title = optionalString(options.title);
    this.description = optionalString(options.description);
    this.canonical = absoluteURL(options.canonical, 'canonical');
    this.robots = robotsContent(options.robots);
    const og = options.openGraph ?? null;
    this.openGraph = og ? {
      title: optionalString(og.title),
      description: optionalString(og.description),
      type: optionalString(og.type),
      url: absoluteURL(og.url, 'openGraph.url'),
      image: absoluteURL(og.image, 'openGraph.image'),
      imageAlt: optionalString(og.imageAlt),
      siteName: optionalString(og.siteName),
      locale: optionalString(og.locale),
    } : null;
    const twitter = options.twitter ?? null;
    this.twitter = twitter ? {
      card: optionalString(twitter.card),
      site: optionalString(twitter.site),
      creator: optionalString(twitter.creator),
    } : null;
    if (options.jsonLD !== undefined && options.jsonLD !== null) {
      // Fail early on values JSON can't represent (cycles, BigInt).
      serializeJSONLD(options.jsonLD);
      this.jsonLD = options.jsonLD;
    } else {
      this.jsonLD = null;
    }
    Object.freeze(this);
  }

  /** Accepts a DocumentMetadata, a plain options object, or nothing. */
  static from(value) {
    if (!value) return null;
    return value instanceof DocumentMetadata ? value : new DocumentMetadata(value);
  }

  /**
   * A copy with some values replaced.
   * @param {Object} changes
   * @returns {DocumentMetadata}
   */
  merging(changes = {}) {
    return new DocumentMetadata({ ...this.toJSON(), ...changes });
  }

  toJSON() {
    return {
      title: this.title ?? undefined,
      description: this.description ?? undefined,
      canonical: this.canonical ?? undefined,
      robots: this.robots ?? undefined,
      openGraph: this.openGraph ?? undefined,
      twitter: this.twitter ?? undefined,
      jsonLD: this.jsonLD ?? undefined,
    };
  }

  /**
   * The <head> tags, one per line, in a fixed order. Open Graph title and
   * description fall back to the document title and description.
   * @returns {string}
   */
  headHTML() {
    const tags = [];
    const meta = (attribute, key, content) => {
      if (content !== null && content !== undefined) {
        tags.push(`<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(content)}">`);
      }
    };
    if (this.title !== null) tags.push(`<title>${escapeText(this.title)}</title>`);
    meta('name', 'description', this.description);
    meta('name', 'robots', this.robots);
    if (this.canonical !== null) tags.push(`<link rel="canonical" href="${escapeAttribute(this.canonical)}">`);
    if (this.openGraph) {
      const og = this.openGraph;
      meta('property', 'og:title', og.title ?? this.title);
      meta('property', 'og:description', og.description ?? this.description);
      meta('property', 'og:type', og.type);
      meta('property', 'og:url', og.url ?? this.canonical);
      meta('property', 'og:image', og.image);
      meta('property', 'og:image:alt', og.imageAlt);
      meta('property', 'og:site_name', og.siteName);
      meta('property', 'og:locale', og.locale);
    }
    if (this.twitter) {
      meta('name', 'twitter:card', this.twitter.card);
      meta('name', 'twitter:site', this.twitter.site);
      meta('name', 'twitter:creator', this.twitter.creator);
    }
    if (this.jsonLD !== null) {
      tags.push(`<script type="application/ld+json">${serializeJSONLD(this.jsonLD)}</script>`);
    }
    return tags.join('\n');
  }
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CHANGE_FREQUENCIES = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

/**
 * A sitemaps.org XML sitemap for the given routes.
 *
 * @param {Array<string|{path?: string, url?: string, lastModified?: string|Date,
 *   changeFrequency?: string, priority?: number}>} routes
 * @param {{baseURL?: string}} [options] - Resolves relative paths
 * @returns {string}
 */
export function sitemap(routes, options = {}) {
  const base = options.baseURL ? absoluteURL(options.baseURL, 'baseURL') : null;
  const entries = routes.map((route) => {
    const spec = typeof route === 'string' ? { path: route } : route;
    const raw = spec.url ?? spec.path;
    let loc;
    try {
      loc = base ? new URL(String(raw), base).href : absoluteURL(raw, 'sitemap url');
    } catch (error) {
      if (error instanceof TypeError && String(error.message).startsWith('DocumentMetadata')) throw error;
      throw new TypeError(`sitemap: invalid route ${JSON.stringify(String(raw))}`);
    }
    if (!/^https?:/.test(loc)) throw new TypeError(`sitemap: route must resolve to an http(s) URL, got ${JSON.stringify(loc)}`);
    const lines = [`    <loc>${xmlEscape(loc)}</loc>`];
    if (spec.lastModified) {
      const date = spec.lastModified instanceof Date ? spec.lastModified : new Date(spec.lastModified);
      if (Number.isNaN(date.getTime())) throw new TypeError(`sitemap: invalid lastModified for ${loc}`);
      lines.push(`    <lastmod>${date.toISOString().slice(0, 10)}</lastmod>`);
    }
    if (spec.changeFrequency) {
      if (!CHANGE_FREQUENCIES.has(spec.changeFrequency)) throw new TypeError(`sitemap: invalid changeFrequency ${JSON.stringify(spec.changeFrequency)}`);
      lines.push(`    <changefreq>${spec.changeFrequency}</changefreq>`);
    }
    if (spec.priority !== undefined) {
      const priority = Number(spec.priority);
      if (!(priority >= 0 && priority <= 1)) throw new TypeError(`sitemap: priority must be between 0 and 1 for ${loc}`);
      lines.push(`    <priority>${priority.toFixed(1)}</priority>`);
    }
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

export default DocumentMetadata;
