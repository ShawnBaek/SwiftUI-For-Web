# AGENTS.md: How to work on SwiftUI-For-Web

This is the contract for every contributor, human or agent (Claude Code, Codex,
Cursor, …). It is short on purpose. The detail lives in `docs/`:

| Read | When |
|---|---|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Before choosing work: goals, current strengths and weaknesses, phased plan |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Before touching `src/`: layers, invariants, documented SwiftUI exceptions |
| [docs/TESTING.md](docs/TESTING.md) | Before writing or changing tests |
| Tracking issue [#43](https://github.com/ShawnBaek/SwiftUI-For-Web/issues/43) | For the live checklist and issue order |

`CLAUDE.md` only points here. If anything disagrees with this file or `docs/`,
these files win; fix the other one.

---

## 1. Principles (non-negotiable)

1. **Zero setup while developing.** Apps are plain HTML, CSS, and native ES
   modules. No `npm install`, bundler, transpiler, or compile step to write,
   run, test, or deploy. Don't add runtime dependencies, dev dependencies, or
   vendored third-party code.
2. **Optional optimized release build.** `node scripts/build.js --entry
   <index.html>` makes a smaller release (tree-shaken and minified, with
   bundling and hashing planned). It uses only Node built-ins, and its output
   must behave exactly like the unbuilt source.
3. **SwiftUI is the reference design.** Public names, parameter labels,
   ownership, and update timing match Apple SwiftUI. A difference is allowed
   only if it's listed in
   [ARCHITECTURE.md § 5](docs/ARCHITECTURE.md#5-documented-exceptions-to-swiftui).
   Don't invent components such as `H1`, `Card`, or `Container`; compose
   `Text`, stacks, and modifiers instead.
4. **Correctness before features.** Follow the phase order in the roadmap. Don't
   add public API on top of a known core bug.
5. **Evidence, not vibes.** Every change states which goal or invariant it
   serves, cites the SwiftUI documentation for any API, and includes a test
   that would fail without the change.

---

## 2. How to work

1. **Pick an issue** from the current roadmap phase. If the work has no issue,
   open one first that states the goal or invariant it serves.
2. **Plan in the issue or PR description.** List the files you'll touch, the
   invariants involved, and the smallest compatible slice.
3. **For any public API, answer the review checklist** before writing code:
   - Does SwiftUI already have this concept, and what's its exact name and
     call shape?
   - Who owns the state, and how does it flow (`Binding`, environment)?
   - When does it update, appear, disappear, or cancel work?
   - What are the accessibility and keyboard semantics?
   - What can't the web reproduce, and does that difference stay internal or
     need a documented exception?
   - Does existing code keep working?
4. **Write the failing test first** (see [TESTING.md](docs/TESTING.md)), then
   implement.
5. **Update the documents your change affects:** `src/index.d.ts`, the
   exports, `docs/ARCHITECTURE.md` (an invariant's status or a new exception),
   `docs/ROADMAP.md` (when an issue closes), and the README if user-visible
   behavior changed.
6. **Keep the PR small.** One issue per PR. Paste the checklist from § 7 into
   the PR body.

---

## 3. The architecture, in 60 seconds

```text
Author code (Text, VStack, …)
   ▼  factory function
Immutable view descriptor   { type, props, children, modifiers, key }
   ▼  Renderer.render → registerRenderer(type, fn)
DOM element (acquireElement from ElementPool)
   ▼  effects created under the current owner (Signal.js createEffect/createRoot)
Fine-grained updates (signals → textContent / attributes / styles)
```

- **The body runs once.** Updates come from effects that read signals, through
  thunks such as `Text(() => …)` and reactive modifiers. There's no virtual DOM.
- **Descriptors are immutable.** Modifiers return new frozen descriptors.
- **Every resource has an owner.** Effects, listeners, lifecycle callbacks, and
  pooled elements are released when their owner is disposed.
- The full invariants (I1–I10), their current status, and the source map are in
  [ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Transitional state (read before editing):**

- The core still has two view systems: descriptors, and legacy `View`
  subclasses such as `Toggle`, `TextField`, `List`, and `NavigationStack`.
  Write all new views as descriptors. The migration is tracked in #48.
- `SignalRenderer.bindReactive` (a DOM walk at mount) is being removed (#44).
  Don't add new reactive wiring there. Create effects inside the renderer, at
  the point where the element is built.
- `src/Core/Chainable.js`, `src/Core/ViewFactory.js`, and `src/Core/index.js`
  are dead code. Don't edit or import them.

---

## 4. Patterns to copy

### 4.1 Adding a modifier

- **Generic modifiers** (any view): add a `ModifierType` and its handler in
  `src/Core/ViewDescriptor.js` and `Renderer.applyModifiers`. Until #48
  introduces one shared modifier table, also add the chain method to every
  descriptor view's `chainable()`: `Text`, `Button`, `VStack`, `HStack`,
  `ZStack`, `Spacer`, `Divider`, and `ForEach`. Add a test that the modifier
  works on at least one view from each family.
- **View-specific modifiers** (change the view's own props, such as
  `Text.bold()`): add them to that view's `chainable()` and have its renderer
  read the new prop. [src/View/Text.js](src/View/Text.js) is the canonical
  example:

```js
// src/View/Text.js — view-specific modifier returning a new immutable descriptor
chain.accessibilityHeading = (level) => {
  const tag = HEADING_TAGS.has(level) ? level : null;
  const newProps = { ...descriptor.props, headingLevel: tag };
  return chainable(createDescriptor(
    'Text', newProps, descriptor.children, descriptor.key, descriptor.modifiers
  ));
};
```

### 4.2 Adding a SwiftUI view

1. Create `src/View/<Category>/<Name>.js` exporting a factory that returns a
   frozen descriptor. Don't create new `View` subclasses.
2. Register a renderer in [src/Core/Renderer.js](src/Core/Renderer.js) with
   `registerRenderer('Name', (props, children) => …)`.
3. Create elements with `acquireElement(tagName)`, not `document.createElement`.
4. Bind reactive props inside the renderer with `createEffect`, under the
   current owner, and clean up through the owner.
5. Export the view from `src/index.js`, in both the default namespace and the
   named exports, and add it to `src/index.d.ts`.
6. Add behavior tests in `Tests/View/<Name>Tests.js` and import them in
   [Tests/TestRunner.html](Tests/TestRunner.html).

### 4.3 Chainable freeze

Every chainable ends with `return Object.freeze(chain);`. Never mutate a
descriptor. Create a new one with `createDescriptor` or `addModifier`.

### 4.4 Animation goes through SwiftUI-shaped APIs

Authors use `withAnimation`, `.transition`, `.animation`, and
`matchedGeometryEffect`. Imperative motion uses `Animation.animate()` or
`animateStyles()`, which wrap native browser primitives. Don't add animation
packages, and don't write raw CSS-transition or `requestAnimationFrame` loops in
product or example code.

```js
// ✅
withAnimation(Animation.easeInOut(0.28), () => {
  animateStyles(cardEl, { transform: 'scale(1)', opacity: '1' });
});
// ❌
element.style.transition = 'transform 220ms ease';
requestAnimationFrame(() => (element.style.transform = 'scale(1)'));
```

### 4.5 Types (`src/index.d.ts`)

The `.d.ts` file is the only source of editor autocomplete without a build step.

- Update it in the same PR as the export.
- Use SwiftUI's exact labels. When a label is a JavaScript reserved word, rename
  it (for example `forType`) and add a `@see` link to Apple's documentation.
- Chainable modifiers return `this`.
- Enums are `const` objects.

Until #47 adds an automatic check, verify the `.d.ts` by hand against the real
signature.

---

## 5. Accessibility, SEO, and shaders

| Need on the web | Use |
|---|---|
| `<h1>`–`<h6>` | `Text(…).accessibilityHeading(AccessibilityHeadingLevel.h1)` |
| `alt` text | `Image(…).accessibilityLabel('…')` |
| A label on a control | `.accessibilityLabel('…')` |
| Effects | `.colorEffect` / `.distortionEffect` / `.layerEffect` with `ShaderLibrary.default` (SVG filters in [src/Graphic/Shader.js](src/Graphic/Shader.js)) |

- Controls must use native elements, or the WAI-ARIA pattern with keyboard
  support (invariant I9, #51).
- When a need has no SwiftUI modifier, find Apple's closest modifier first.
  Don't ship a web-only API.
- Don't add a `.cssFilter()` or arbitrary-GLSL escape hatch.

---

## 6. Performance rules

- Create elements with `acquireElement`. Pool release must clear handlers and
  lifecycle callbacks (#46).
- Don't assign untrusted strings with `innerHTML`; use `textContent` or
  `appendChild`.
- Don't read layout (`getBoundingClientRect`, `offsetWidth`) and then write
  styles in the same pass.
- Reactivity is opt-in: an eager value is set once, and a reactive value is a
  thunk plus an effect.
- Don't add MutationObservers; use the shared `LifecycleObserver`.
- Animate `transform` and `opacity`. Hide animated elements with
  `visibility: hidden` and `pointer-events: none`, not `display: none`.
- Benchmarks must measure in-place updates, not full remounts. Report size from
  `node scripts/size.js` after a release build.

---

## 7. PR checklist (paste into the PR body)

```
- [ ] Serves issue #___ (roadmap phase ___) / invariant I___
- [ ] Zero new dependencies; still runs with no install or build
- [ ] Public API name and labels match SwiftUI (doc URL: ___), or the change is listed in ARCHITECTURE.md § 5
- [ ] Failing test written first; tests assert behavior on the live path
- [ ] Browser runner and `node run-tests.js` pass; `node scripts/build-tests.js` passes
- [ ] New views are descriptors with `acquireElement`; reactive props bound in the renderer under an owner
- [ ] Exported from src/index.js (default + named) and typed in src/index.d.ts
- [ ] Docs updated: ARCHITECTURE invariant status / ROADMAP / README as needed
```

---

## 8. Common mistakes

- ❌ Adding a `View` subclass, or editing `Chainable.js` or `ViewFactory.js`.
- ❌ Wiring reactivity in `bindReactive`. It only runs at mount, so it breaks
  inside `Show` and `For`.
- ❌ Tests that assert `.type`, `Object.isFrozen`, or "returns this", or that
  compare a literal CSS string the browser normalizes.
- ❌ Adding `H1`, `Card`, or similar views, or ad-hoc CSS classes. Styles flow
  through modifiers into the renderer, and `src/styles/` holds only reset and
  base CSS.
- ❌ Forgetting the named export, or the `.d.ts` entry.
- ❌ Using `document.createElement` in a renderer, or adding a MutationObserver.
- ❌ Adding animation dependencies, or raw transition/`requestAnimationFrame` code.
- ❌ Toggling `display` on animated elements.
- ❌ Making Playwright, jsdom, or any npm package a requirement.

When in doubt, copy the nearest descriptor-based view in `src/View/` and check
the invariants in [ARCHITECTURE.md](docs/ARCHITECTURE.md).
