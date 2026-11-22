# AppleSampleCode proof (#40)

This example renders one real page type from
[AppleSampleCode](https://applesamplecode.com) with SwiftUI-For-Web's static
renderer, and a test checks it against the page AppleSampleCode's own Python
renderer (`_scripts/render_html_site.py`) generates.

**Page type:** the framework collection page, `_site/<Framework>/index.html`.
The instance is **Core NFC** (`https://applesamplecode.com/Core%20NFC/`):
site header, documentation sidebar, breadcrumbs, a page heading, a facts
list, four tables, references and the site footer.

| File | Role |
|---|---|
| `core-nfc.json` | The data the page needs (site settings, Core NFC rows), copied from AppleSampleCode's `Core NFC/README.md` and renderer constants |
| `views.js` | `CollectionPage(data)`, `CollectionScene(data)` and `pageMetadata(data)`: the page as SwiftUI-For-Web views |
| `render.mjs` | Writes `out/index.html` with `renderDocument` |
| `client.js` | Mounts the same scene in the browser: `mode: 'adopt'` over `out/index.html`, a fresh render on the empty shell |
| `index.html` | Client-only shell (the "before" case) |
| `out/index.html` | The static page (committed; the test checks it is current) |
| `semantics.mjs` | A dependency-free HTML parser and the semantic extractor the test uses |
| `fixtures/python-core-nfc.html` | The Python renderer's output for the same page, copied unchanged from AppleSampleCode `_site/Core NFC/index.html` (commit `7bdd9a01`) |

```bash
node Examples/AppleSampleCodeProof/render.mjs        # regenerate out/index.html
node scripts/run-node-suites.js                      # runs Tests/Server/AppleSampleCodeProofTests.js
python3 serve.py                                     # then open /Examples/AppleSampleCodeProof/out/index.html
```

## What the test compares

`Tests/Server/AppleSampleCodeProofTests.js` parses both documents and compares
meaning, not bytes. Every check passes:

| Check | Result |
|---|---|
| `<title>`, description, canonical, `lang` | same |
| `og:*` (5 tags) and `twitter:*` (3 tags), and every other `<meta>` | same |
| JSON-LD (`BreadcrumbList`, 3 items) | same, compared as parsed JSON |
| Headings: text, level and `id`, in order (1 × h1, 3 × h2, 3 × h3) | same |
| Links: `href`, text and `aria-label`, in order (24) | same; every `#fragment` has a target |
| Landmarks: role and name, in order (banner, navigation "Primary", search, complementary, region "Framework", navigation "On this page", navigation "Breadcrumb", main, contentinfo) | same |
| Lists and their items (6 lists) | same |
| Tables: header cells and body rows (4 tables) | same |
| Visible text, word by word | same, 293 words |

Visible text is the body's text without `<script>`, `<style>` and elements
hidden with `hidden` or a visually-hidden class. Every element boundary
separates words, so the result does not depend on how a renderer splits
inline runs.

## Curl-visible words

| Page | Words without JavaScript |
|---|---:|
| `index.html` (client-only SwiftUI-For-Web, before) | 0 |
| `out/index.html` (SwiftUI-For-Web static render, after) | 293 |
| Python renderer output | 293 |

Count them with `node Examples/AppleSampleCodeProof/semantics.mjs <file>...`.

## Differences that remain

The comparison passes, but the markup is not the same, and these are the
differences:

- **Element names.** The Python page uses `<header>`, `<nav>`, `<aside>`,
  `<main>`, `<article>`, `<footer>`, `<ul>`/`<ol>`, `<table>`, `<p>`,
  `<code>` and `<strong>`. SwiftUI-For-Web renders stacks as `<div>` and Text
  as `<span>`, so the views add ARIA roles (`banner`, `navigation`, `main`,
  `list`, `table`, `row`, `cell`, …) through the public `.modifier(_:)`
  API. The accessibility tree is the same, apart from the `<article>`
  element, which has no counterpart. Inline code and bold are styled `Text`
  (monospaced font, `.bold()`), not `<code>`/`<strong>` elements.
- **Search.** The Python page has a `<form role="search">` that submits
  `?q=` to the home page without JavaScript, with a visually hidden label
  "Search sample analyses". `.searchable(_:prompt:)` renders a
  `role="search"` field named "Search samples" with no form, so it does
  nothing without JavaScript.
- **Collapsible sidebar sections.** "On this page" and "2 samples in Core
  NFC" are `<details>` on the Python page. Here they are plain sections that
  are always shown. `DisclosureGroup` would add a visible chevron character
  and hides its content until opened.
- **Head tags without a `DocumentMetadata` field.** `twitter:title`,
  `twitter:description` and the site's `docc-page-kind` meta go through
  `renderDocument`'s `head` option (escaped in `views.js`). The favicon,
  the site's stylesheet and its visitor-counter script are not included.
- **Links.** `NavigationLink(_:destination:url:)` renders `<a href>`, but
  its click handler cancels the browser's navigation and pushes onto a
  `NavigationStack`. Outside a stack, a plain click does nothing.
  `PageLink` in `views.js` stops that handler so the browser follows the
  href. SwiftUI's `Link(_:destination:)` would be the natural API for this.
