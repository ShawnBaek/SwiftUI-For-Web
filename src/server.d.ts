/**
 * SwiftUI-For-Web server entry (#40): static rendering in Node.
 */

/** A view, a view descriptor, or a function (or View subclass) returning one. */
export type RenderableContent = unknown;

/** Render a view to the HTML its first browser render produces. Deterministic. */
export function renderToString(content: RenderableContent): string;

export interface RenderDocumentOptions {
  /** Scene metadata; defaults to the WindowGroup's `{ metadata }`. */
  metadata?: DocumentMetadata | DocumentMetadataOptions;
  /** `<html lang>`, default `"en"`. */
  lang?: string;
  /** Id of the element the markup is rendered into, default `"root"`. */
  rootId?: string;
  /** Stylesheet hrefs, emitted as `<link rel="stylesheet">`. */
  stylesheets?: string[];
  /** Module script srcs, emitted at the end of `<body>`. */
  scripts?: string[];
  /** Extra trusted markup appended to `<head>`. */
  head?: string;
}

/** Render a complete HTML document with the scene's metadata. Deterministic. */
export function renderDocument(content: RenderableContent, options?: RenderDocumentOptions): string;

export interface DocumentMetadataOptions {
  title?: string;
  description?: string;
  /** Absolute http(s) URL. */
  canonical?: string;
  /** A robots string such as `"noindex, follow"`, or flags. */
  robots?: string | { index?: boolean; follow?: boolean; directives?: string[] };
  openGraph?: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    image?: string;
    imageAlt?: string;
    siteName?: string;
    locale?: string;
  };
  twitter?: { card?: string; site?: string; creator?: string };
  /** Structured data, serialized into `<script type="application/ld+json">`. */
  jsonLD?: object | object[];
}

/** Scene-level document metadata (a web-only exception: SwiftUI has no `<head>`). */
export class DocumentMetadata {
  constructor(options?: DocumentMetadataOptions | DocumentMetadata);
  static from(value: DocumentMetadata | DocumentMetadataOptions | null | undefined): DocumentMetadata | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly canonical: string | null;
  readonly robots: string | null;
  readonly openGraph: Required<NonNullable<DocumentMetadataOptions['openGraph']>> | null;
  readonly twitter: Required<NonNullable<DocumentMetadataOptions['twitter']>> | null;
  readonly jsonLD: object | object[] | null;
  /** A copy with some values replaced. */
  merging(changes: DocumentMetadataOptions): DocumentMetadata;
  toJSON(): DocumentMetadataOptions;
  /** Escaped `<head>` tags in a fixed order, one per line. */
  headHTML(): string;
}

export interface SitemapRoute {
  path?: string;
  url?: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** 0 to 1. */
  priority?: number;
}

/** A sitemaps.org XML sitemap. */
export function sitemap(routes: Array<string | SitemapRoute>, options?: { baseURL?: string }): string;

/** JSON for `<script type="application/ld+json">`, with `<`, `>`, `&`, U+2028 and U+2029 escaped. */
export function serializeJSONLD(value: unknown): string;

declare const SwiftUIServer: {
  renderToString: typeof renderToString;
  renderDocument: typeof renderDocument;
  DocumentMetadata: typeof DocumentMetadata;
  sitemap: typeof sitemap;
  serializeJSONLD: typeof serializeJSONLD;
};
export default SwiftUIServer;
