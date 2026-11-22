/**
 * AppleSampleCodeProof views (#40): the AppleSampleCode framework collection
 * page ("Core NFC/index.html"), written as SwiftUI-For-Web views.
 *
 * The same `CollectionPage(data)` renders in Node (render.mjs, through
 * renderDocument) and in the browser (client.js, mount mode 'adopt'). Data
 * comes from core-nfc.json; nothing here is specific to Core NFC.
 *
 * Web-only pieces, all through the public `.modifier(_:)` escape hatch,
 * because SwiftUI has no equivalent:
 * - `landmark(role, label)`: ARIA landmark roles (banner, navigation, main,
 *   complementary, contentinfo) on stacks, since stacks render as <div>.
 * - `attributes({...})`: element ids for in-page fragment links, and list /
 *   table roles where a stack or Grid stands in for <ul>/<table>.
 */

import {
  VStack, HStack, Text, Spacer, Divider, Grid, GridRow, NavigationLink, List,
  ListStyle, State, Font, Color, Alignment, AccessibilityHeadingLevel,
  WindowGroup,
} from '../../src/index.js';

// ---------------------------------------------------------------------------
// Web-only helpers (ViewModifier objects: `apply(element)`)
// ---------------------------------------------------------------------------

/** Set attributes on the rendered element. */
export const attributes = (map) => ({
  apply(element) {
    for (const [name, value] of Object.entries(map)) element.setAttribute(name, String(value));
  },
});

/** An ARIA landmark, optionally named. */
export const landmark = (role, label = null) => attributes(label ? { role, 'aria-label': label } : { role });

// Lay the children out as inline text instead of a flex row, so a run of
// Text views reads (and wraps) like one paragraph with inline code.
const inlineFlow = {
  apply(element) {
    element.style.display = 'block';
  },
};

// NavigationLink(url:) navigates inside a NavigationStack and cancels the
// browser's navigation. On a static multi-page site the browser should follow
// the href, so stop the link's own handler before it runs (a capture listener
// on the target runs first).
const followsHref = {
  apply(element) {
    element.addEventListener('click', (event) => event.stopImmediatePropagation(), true);
  },
};

/** A plain hyperlink: NavigationLink with a URL that the browser follows. */
export function PageLink(title, href, { label = null, id = null } = {}) {
  let link = NavigationLink(title, null, { url: href }).modifier(followsHref);
  if (label) link = link.accessibilityLabel(label);
  if (id) link = link.modifier(attributes({ id }));
  return link;
}

// ---------------------------------------------------------------------------
// Inline runs: ["text ", { code: "x" }, { strong: "y" }]
// ---------------------------------------------------------------------------

const codeFont = Font.system(15).monospaced();

function InlineText(part) {
  if (typeof part === 'string') return Text(part);
  if (part.code !== undefined) return Text(part.code).font(codeFont);
  if (part.strong !== undefined) return Text(part.strong).bold();
  throw new TypeError(`Unknown inline part ${JSON.stringify(part)}`);
}

/** A paragraph built from inline parts. */
export function Paragraph(parts, extra = null) {
  const runs = Array.isArray(parts) ? parts : [parts];
  let view = HStack({ spacing: 0 }, ...runs.map(InlineText)).modifier(inlineFlow);
  if (extra) view = view.modifier(extra);
  return view;
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Heading(text, level, id, font) {
  return Text(text).accessibilityHeading(level).font(font).modifier(attributes({ id }));
}

/** A landmark around content that keeps its own role (a list inside a nav). */
function Landmark(role, label, content) {
  return VStack({ alignment: Alignment.leading, spacing: 0 }, content).modifier(landmark(role, label));
}

/** A vertical list (role=list) of rows. */
function ListOf(items, row, { label = null } = {}) {
  const list = List(items, (item) => row(item)).listStyle(ListStyle.plain);
  return label ? list.modifier(attributes({ 'aria-label': label })) : list;
}

/** A horizontal list (role=list) for navigation bars. */
function RowList(items, row, spacing = 16) {
  return HStack({ spacing }, ...items.map((item) => VStack(row(item)).modifier(attributes({ role: 'listitem' }))))
    .modifier(attributes({ role: 'list' }));
}

/** A table: Grid with table, row, columnheader and cell roles. */
function Table(columns, rows) {
  const header = GridRow(...columns.map((title) => Text(title).bold().modifier(attributes({ role: 'columnheader' }))))
    .modifier(attributes({ role: 'row' }));
  const body = rows.map((cells) => GridRow(...cells.map((cell) => {
    const view = typeof cell === 'object' && cell !== null && !Array.isArray(cell) && cell.view ? cell.view : Paragraph(cell);
    return view.modifier(attributes({ role: 'cell' }));
  })).modifier(attributes({ role: 'row' })));
  return Grid({ alignment: Alignment.leading, horizontalSpacing: 16, verticalSpacing: 10 }, header, ...body)
    .modifier(attributes({ role: 'table' }));
}

// ---------------------------------------------------------------------------
// Page regions, in the order the Python renderer writes them
// ---------------------------------------------------------------------------

const primaryNavigation = [
  ['Explore', '../index.html#swiftui-sample-explorer-heading'],
  ['Patterns', '../PATTERNS.html'],
  ['Frameworks', '../FRAMEWORKS.html'],
  ['MCP', '../MCP.html'],
  ['About', '../ABOUT.html'],
];

function SiteHeader(site, query) {
  return HStack({ spacing: 24 },
    PageLink(site.name, '../index.html', { label: `${site.name} home` }).font(Font.headline),
    Landmark('navigation', 'Primary', RowList(primaryNavigation, ([title, href]) => PageLink(title, href))),
    Spacer().searchable(query, { prompt: 'Search samples' }),
  )
    .padding({ horizontal: 24, vertical: 12 })
    .modifier(landmark('banner'));
}

function Sidebar(page, toc, samples) {
  return VStack({ alignment: Alignment.leading, spacing: 16 },
    VStack({ alignment: Alignment.leading, spacing: 4 },
      Text('Explore').font(Font.caption).foregroundColor(Color.secondary),
      PageLink('Search samples', '../index.html#swiftui-sample-explorer-heading'),
    ),
    VStack({ alignment: Alignment.leading, spacing: 4 },
      Text('Framework').font(Font.caption).foregroundColor(Color.secondary),
      PageLink(page.module, 'index.html').modifier(attributes({ 'aria-current': 'page' })),
    ).modifier(landmark('region', 'Framework')),
    VStack({ alignment: Alignment.leading, spacing: 4 },
      Text('On this page').font(Font.caption).foregroundColor(Color.secondary),
      Landmark('navigation', 'On this page', ListOf(toc, ({ title, anchor }) => PageLink(title, `#${anchor}`))),
    ),
    VStack({ alignment: Alignment.leading, spacing: 4 },
      Text(`${samples.length} samples in ${page.module}`).font(Font.caption).foregroundColor(Color.secondary),
      ListOf(samples, (sample) => PageLink(sample.title, sample.href)),
    ),
  )
    .frame({ width: 260 })
    .padding(16)
    .modifier(landmark('complementary', 'Documentation navigation'));
}

function Breadcrumbs(page) {
  return Landmark('navigation', 'Breadcrumb', RowList([
    PageLink('Home', '../index.html'),
    PageLink('Frameworks', '../FRAMEWORKS.html'),
    Text(page.module).modifier(attributes({ 'aria-current': 'page' })),
  ], (item) => item, 8));
}

function Article(page) {
  const sampleRows = page.samples.map((sample) => [
    { view: PageLink(sample.title, sample.href) },
    sample.platforms,
    sample.architecture,
    sample.patterns,
  ]);
  return VStack({ alignment: Alignment.leading, spacing: 16 },
    Text(page.kindLabel).font(Font.caption).foregroundColor(Color.secondary)
      .modifier(attributes({ 'aria-label': 'Page metadata' })),
    Heading(page.title, AccessibilityHeadingLevel.h1, page.anchor, Font.largeTitle),
    Paragraph(page.intro),
    ListOf(page.facts, (parts) => Paragraph(parts)),

    Heading('Samples', AccessibilityHeadingLevel.h2, 'samples', Font.title2),
    Table(['Sample', 'Platforms', 'High-level architecture', 'Documented patterns'], sampleRows),

    Heading('Cross-sample signals', AccessibilityHeadingLevel.h2, 'cross-sample-signals', Font.title2),
    ...page.signals.flatMap((signal) => [
      Heading(signal.title, AccessibilityHeadingLevel.h3, signal.anchor, Font.title3),
      ...(signal.note ? [Paragraph(signal.note)] : []),
      Table(signal.columns, signal.rows),
    ]),

    Heading('References', AccessibilityHeadingLevel.h2, 'references', Font.title2),
    ListOf(page.references, ({ title, href }) => PageLink(title, href)),
    Paragraph(page.generatedNote),
  );
}

function SiteFooter(site) {
  return VStack({ alignment: Alignment.leading, spacing: 12 },
    Paragraph(site.footerNotice),
    HStack({ spacing: 16 },
      PageLink('Created by Shawn Baek', site.creatorURL),
      PageLink('Apple Sample Code License', site.licenseURL),
      PageLink('Built with SwiftUI for Web', site.frameworkURL),
      PageLink('Back to top', '#main-content'),
    ),
    HStack({ spacing: 24 },
      ...[['Today', 'today'], ['This month', 'thisMonth'], ['All time', 'allTime']].map(([title, key]) =>
        HStack({ spacing: 6 },
          Text(title).foregroundColor(Color.secondary),
          Text('—').modifier(attributes({ 'data-visit-count': key })),
        )),
    ).modifier(attributes({ 'aria-label': 'Site visits', 'data-visitor-counter': '', 'data-endpoint': site.visitorCounterEndpoint })),
  )
    .padding(24)
    .modifier(landmark('contentinfo'));
}

/**
 * The whole framework collection page.
 * @param {Object} data - core-nfc.json
 * @param {State} [query] - search field text
 */
export function CollectionPage(data, query = new State('')) {
  const { site, page } = data;
  const toc = [
    { title: 'Samples', anchor: 'samples' },
    { title: 'Cross-sample signals', anchor: 'cross-sample-signals' },
    { title: 'References', anchor: 'references' },
  ];
  return VStack({ alignment: Alignment.leading, spacing: 0 },
    PageLink('Skip to content', '#main-content'),
    SiteHeader(site, query.binding),
    Divider(),
    HStack({ alignment: Alignment.top, spacing: 24 },
      Sidebar(page, toc, page.samples),
      VStack({ alignment: Alignment.leading, spacing: 16 },
        Breadcrumbs(page),
        Article(page).modifier(attributes({ id: 'main-content' })).modifier(landmark('main')),
      ).padding(24),
    ),
    Divider(),
    SiteFooter(site),
  ).navigationTitle(seoTitle(page.title));
}

// ---------------------------------------------------------------------------
// Metadata (same rules as render_html_site.py: seo_title, structured_data)
// ---------------------------------------------------------------------------

export function seoTitle(title) {
  const suffix = ' — Apple Sample Code';
  return title.length + suffix.length > 60 ? title : title + suffix;
}

export function pageMetadata(data) {
  const { site, page } = data;
  const title = seoTitle(page.title);
  const description = `Source-backed architecture analysis for ${page.title}`;
  const url = `${site.url}${page.path}`;
  // Plain DocumentMetadata options; renderDocument and WindowGroup accept them.
  return {
    title,
    description,
    canonical: url,
    openGraph: { type: 'article', siteName: site.name, title, description, url },
    twitter: { card: 'summary' },
    jsonLD: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.url}/` },
        { '@type': 'ListItem', position: 2, name: 'Frameworks', item: `${site.url}/FRAMEWORKS.html` },
        { '@type': 'ListItem', position: 3, name: page.title, item: url },
      ],
    },
  };
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * <head> tags DocumentMetadata has no field for (twitter:title and
 * twitter:description, and the site's docc-page-kind), for renderDocument's
 * `head` option. Values are escaped here.
 */
export function extraHeadTags(data) {
  const { title, description } = pageMetadata(data);
  return [
    `<meta name="docc-page-kind" content="${escapeAttribute(data.page.kind)}">`,
    `<meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
  ].join('\n');
}

/** The scene: WindowGroup carrying the page's DocumentMetadata. */
export function CollectionScene(data, query) {
  return WindowGroup({ metadata: pageMetadata(data) }, () => CollectionPage(data, query));
}
