# AGENTS.md — Guide for AI Agents writing SwiftUI-For-Web code

This file is the contract any agent (Claude Code, Codex, Cursor, Aider, etc.)
should read before writing code in this repo. The long-form reference lives
in [CLAUDE.md](./CLAUDE.md); this file is the **short, enforceable subset** —
the rules that, if violated, will get a PR rejected.

---

## 1. Non-negotiable constraints

1. **No `npm install` or build step required for development.** Pure ES
   modules + CSS3 + HTML5 at the user's edge. The framework imports its own
   source directly; users add zero npm packages and run no bundler.
   `node scripts/build.js --entry <index.html>` is an optional, built-in
   release optimization path and must stay dependency-free.
   - **No vendored runtime exceptions.** Do not add third-party JS,
     package dependencies, bundlers, or transpilers. Animation code routes
     through SwiftUI-shaped APIs in [`src/Animation/Animation.js`](src/Animation/Animation.js)
     and uses native browser primitives internally.
2. **SwiftUI API parity is law.** Every public symbol must already exist in
   Apple SwiftUI with the same name, same parameter labels, same semantics.
   - ✅ `.foregroundColor(Color.blue)`, `.padding(20)`, `.accessibilityHeading(.h1)`
   - ❌ `.color('blue')`, `.gap(20)`, `.h1()`
3. **No invented components.** Don't add `H1`, `Hero`, `Container`, `Card`,
   `Heading`, etc. If SwiftUI doesn't ship it, express it as a `Text` /
   `VStack` / `HStack` / `Group` composition with modifiers.
4. **One canonical Apple reference per change.** When implementing or
   modifying a public API, cite the SwiftUI doc URL in the PR description
   (or as a `@see` comment) so reviewers can verify the signature.

---

## 2. The architecture, in 60 seconds

```
Author code (Text, VStack, …)
   ▼  factory function
Immutable view descriptor   { type, props, children, modifiers, key }
   ▼  Renderer.js (registerRenderer per type)
DOM element (acquireElement from ElementPool)
   ▼  SignalRenderer.bindReactive
Reactive bindings via createEffect (signals → textContent / styles)
   ▼  withAnimation / .transition / .animation
Animation.js ──►  Web Animations API / CSS transitions / View Transitions API
```

Key files (read these before adding anything non-trivial):

- [src/Core/ViewDescriptor.js](src/Core/ViewDescriptor.js) — descriptor shape + `addModifier`, `setKey`, `ModifierType`
- [src/Core/Renderer.js](src/Core/Renderer.js) — per-type renderers (`registerRenderer('Text', …)`)
- [src/Core/SignalRenderer.js](src/Core/SignalRenderer.js) — mount + reactive binding walk
- [src/Core/ElementPool.js](src/Core/ElementPool.js) — DOM recycling
- [src/Data/Signal.js](src/Data/Signal.js) — `createEffect`, `createRoot`, `untrack`
- [src/Animation/Animation.js](src/Animation/Animation.js) — `Animation`, `withAnimation`, `animate`, `animateStyles`, `AnyTransition`, `Namespace`
- [src/Graphic/Shader.js](src/Graphic/Shader.js) — `Shader`, `ShaderLibrary`, `ShaderKind` for `.colorEffect` / `.distortionEffect` / `.layerEffect`
- [src/index.js](src/index.js) — public exports (default + named, both required)
- [src/index.d.ts](src/index.d.ts) — TypeScript / VSCode intellisense definitions; **update this whenever you add or change a public API**

**Mental model:** descriptors are immutable. Modifiers return *new* frozen
descriptors. The body runs **once** at mount; updates happen via signal
effects that mutate specific DOM properties — there is no VDOM diff.
Animations run through `Animation.js`, which exposes SwiftUI-shaped APIs and
keeps native browser animation details invisible to the user's code.

---

## 3. The patterns to copy

### 3.1 Adding a new modifier to an existing view

If the modifier is generic (works on any View), add it to the shared
chainable in [src/Core/ViewFactory.js](src/Core/ViewFactory.js) and add a
matching `ModifierType` + handler in
[src/Core/ViewDescriptor.js](src/Core/ViewDescriptor.js) and Renderer's
`applyModifiers`.

If the modifier is view-specific (changes the descriptor's own props, like
`Text.bold()` or `Image.resizable()`), add it to that view's local
`chainable()` and have the renderer read the new prop. See
[src/View/Text.js](src/View/Text.js) for the canonical pattern.

```js
// src/View/Text.js — view-specific modifier (new immutable descriptor)
chain.accessibilityHeading = (level) => {
  const tag = HEADING_TAGS.has(level) ? level : null;
  const newProps = { ...descriptor.props, headingLevel: tag };
  return chainable(createDescriptor(
    'Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers
  ));
};
```

### 3.2 Adding a new SwiftUI view

1. Create `src/View/<Category>/<Name>.js` exporting a factory function that
   returns a frozen chainable descriptor.
2. Register a renderer in [src/Core/Renderer.js](src/Core/Renderer.js):
   `registerRenderer('Name', (props, children) => { … return element; });`
3. Use `acquireElement(tagName)` — never `document.createElement` directly.
   This keeps pooling working.
4. Wire reactive props through `props.xxxThunk` patterns + `createEffect`
   in `SignalRenderer.bindReactive` (only if the prop needs to update after
   mount).
5. Export from [src/index.js](src/index.js) in **both** the default
   `SwiftUI` namespace object AND the named `export { … }` list.
6. Add tests at `Tests/View/<Name>Tests.js` and load them from
   [Tests/TestRunner.html](Tests/TestRunner.html).

### 3.3 The chainable freeze pattern (don't break it)

Every chainable wrapper ends with `return Object.freeze(chain);`. This is
load-bearing — it prevents mutation and lets the runtime trust descriptors.
If you find yourself wanting to mutate a descriptor, you want a *new* one
via `createDescriptor(...)` / `addModifier(...)`.

### 3.4 Animation — always route through SwiftUI-shaped APIs

Users author `withAnimation`, `.transition`, `.animation`, and
`matchedGeometryEffect`. Imperative DOM-backed motion uses `Animation.animate()`
or `animateStyles()`. **Never add a raw package animation engine or hand-code
CSS transition/rAF loops in product examples.**

```js
// ✅ Correct — product/framework code stays on the public SwiftUI-style surface
import { Animation, animateStyles, withAnimation } from '../Animation/Animation.js';

withAnimation(Animation.easeInOut(0.28), () => {
  animateStyles(cardEl, {
    transform: 'translate(-50%, -50%) scale(1)',
    opacity: '1'
  });
});
```

```js
// ❌ Wrong — raw animation plumbing in product/sample code
element.style.transition = 'transform 220ms ease';
requestAnimationFrame(() => element.style.transform = 'scale(1)');
```

### 3.5 TypeScript / VSCode intellisense (`src/index.d.ts`)

Every public symbol exported from `src/index.js` needs a matching definition
in [`src/index.d.ts`](src/index.d.ts). The `.d.ts` file is the only thing
that gives users autocomplete in VSCode without a build step.

Rules:
- Add the type when you add the export — don't defer it.
- Mirror SwiftUI's exact parameter labels (avoid JS reserved words like `for`
  — rename to e.g. `forType` with a `@see` comment pointing to the Apple doc).
- Chainable modifiers return the same interface type, e.g.
  `foregroundColor(color: Color): this`.
- Enums (like `AccessibilityHeadingLevel`, `ShaderKind`) are typed as
  `const` objects with a string/number union value type.

---

## 4. SEO & accessibility

SwiftUI's accessibility modifiers do double duty on the web. Prefer them
over inventing web-only escape hatches.

| Need on web              | SwiftUI modifier (use this)                  |
| ------------------------ | -------------------------------------------- |
| `<h1>`–`<h6>` for SEO    | `Text(...).accessibilityHeading(.h1)`        |
| `alt=` on images         | `Image(...).accessibilityLabel('…')`         |
| `aria-label` on controls | `Button(...).accessibilityLabel('…')` *(when added)* |
| Landmark role / heading  | `.accessibilityAddTraits(.isHeader)` *(when added)*  |
| Shader-style effects     | `.colorEffect(ShaderLibrary.default.<fn>())` / `.distortionEffect()` / `.layerEffect()` — see "Shader effects" below |

`AccessibilityHeadingLevel` exposes `.h1` … `.h6` and `.unspecified`. The
renderer swaps `<span>` → `<h1..h6>` and resets user-agent heading styling
so visuals stay driven by `.font()` / `.fontWeight()` modifiers — same
visual output as a plain `Text`, but real semantic markup.

```js
Text('Pricing').accessibilityHeading(AccessibilityHeadingLevel.h1)
  .font(Font.largeTitle)
  .foregroundColor(Color.primary)
```

If a future SEO/a11y need doesn't match an existing SwiftUI modifier:
**find Apple's modifier first**, then mirror it. Don't ship a web-only API.

---

## 4b. Shader effects (`.colorEffect`, `.distortionEffect`, `.layerEffect`)

Apple's Metal-shader modifiers (iOS 17+) are backed on the web by **SVG
filter graphs** in [src/Graphic/Shader.js](src/Graphic/Shader.js), mounted
into a single shared `<svg><defs>` in `document.head` by the renderer.
Every modern browser GPU-accelerates these.

Use the curated `ShaderLibrary.default` catalogue:

```js
Image('cat.jpg')
  .colorEffect(ShaderLibrary.default.hueRotate(90))
  .layerEffect(ShaderLibrary.default.blur(4));
```

To add a new preset shader: add a factory to `ShaderLibrary.default` in
[src/Graphic/Shader.js](src/Graphic/Shader.js) that returns
`new Shader(kind, name, args, (filterEl, args) => { appendPrimitive(...) })`.
The `kind` (`color` | `distortion` | `layer`) gates which modifier accepts
it, and the `(name, args)` pair gives the resulting `<filter>` a stable id
so reused shaders share a single DOM definition.

**Do not** add an `.h1Effect()` / `.cssFilter()` / arbitrary-GLSL escape
hatch as a new public API yet — the SwiftUI surface is `colorEffect` /
`distortionEffect` / `layerEffect` and the only thing that changes between
them is what shader they accept. A WebGL2 / WGSL backend for user-supplied
shader source code can slot in later behind the same `Shader` API.

## 5. Performance rules that aren't optional

- **Pool elements.** Use `acquireElement(tag)`; release via the runtime —
  don't create raw DOM.
- **No `innerHTML`.** Set `textContent` or build with `appendChild`.
  `innerHTML` defeats pooling and opens XSS holes.
- **No layout thrash.** Batch style writes inside the renderer; never read
  layout (`offsetWidth`, `getBoundingClientRect`) and then write in the
  same pass.
- **Reactivity is opt-in.** Eager values are set once at mount. Reactive
  props use the `xxxThunk` pattern + `createEffect` in `bindReactive`.
- **Don't add MutationObservers.** A shared `LifecycleObserver` already
  handles `onAppear` / `onDisappear`.
- **`visibility` over `display` for animated elements.** Toggling
  `display:none → block` triggers a full layout pass and causes dropped
  frames. Use `visibility:hidden / pointer-events:none` to hide, and
  `visibility:visible / pointer-events:auto` to show — the element stays
  in the layout tree, so the compositor can animate it without a reflow.
- **Compositor-friendly animation.** Prefer `transform` and `opacity` in
  `Animation.animate()` / `animateStyles()` calls so the browser can avoid
  layout and paint work. Target: click → first frame under 10 ms.

---

## 6. Tests

- Browser-based runner: [Tests/TestRunner.html](Tests/TestRunner.html).
- For every new public method or renderer change, add a test in the matching
  `Tests/<Category>/<Name>Tests.js` and import it from the runner.
- Tests use `describe / it / expect` from [Tests/TestUtils.js](Tests/TestUtils.js).
- Run `node run-tests.js` and `node scripts/build-tests.js` locally.
- Playwright specs are optional external browser validation; they must not
  become required for development, production builds, or CI.

---

## 7. PR checklist (paste into the PR body)

```
- [ ] Zero new dependencies and no vendored runtime libraries
- [ ] Public API name + parameter labels match SwiftUI exactly
- [ ] SwiftUI doc URL referenced for any new API
- [ ] No invented non-SwiftUI views/modifiers
- [ ] Renderer uses acquireElement (not document.createElement)
- [ ] Exported from src/index.js (default namespace + named)
- [ ] src/index.d.ts updated for any new/changed public symbol
- [ ] Tests added under Tests/<Category>/
- [ ] Test runner loads the new test file
- [ ] Animation code routes through `Animation`, `withAnimation`, or `animateStyles`
- [ ] Animated show/hide uses visibility:hidden (not display:none)
```

---

## 8. Things agents commonly get wrong here

- ❌ Reaching for `<h1>` / `<h2>` as separate components. Use
  `Text(...).accessibilityHeading(.h1)`.
- ❌ Mutating a returned descriptor (it's `Object.freeze`d — silent fail in
  non-strict, throw in strict).
- ❌ Adding ad-hoc CSS classes. Styles flow through modifiers → renderer
  inline styles. The only CSS in `src/styles/` is reset/base.
- ❌ Inventing factory signatures. Check the SwiftUI doc and the existing
  factory siblings before adding a new one.
- ❌ Forgetting the named export in `src/index.js` (default-only breaks
  tree-shaking imports).
- ❌ Writing a new MutationObserver instead of using `LifecycleObserver`.
- ❌ Adding animation dependencies or using raw CSS transition/rAF plumbing
  in product/sample code. Route motion through `Animation`, `withAnimation`,
  or `animateStyles`.
- ❌ Toggling `display:none / display:block` on elements that animate.
  This forces a layout pass and causes a dropped frame. Use
  `visibility:hidden / pointer-events:none` instead.
- ❌ Forgetting to update `src/index.d.ts` after adding a public API.
  Without the `.d.ts` entry, VSCode shows no autocomplete for the new symbol.
- ❌ Using a JavaScript reserved word (`for`, `in`, `class`, `default`) as a
  TypeScript parameter label in `.d.ts`. Rename to e.g. `forType` and add a
  `@see` comment pointing to the Apple doc.

When in doubt: read the nearest already-shipped view in `src/View/` and
mirror its shape exactly.
