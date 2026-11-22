# Changelog

## Unreleased

- Rows of a reactive `ForEach` inside a `List` are list rows (#52): they get
  the row styling, the `listitem`/`option` role, and take part in selection
  and keyboard navigation, including rows added later (the first row of an
  empty list takes the Tab stop). A selectable `List` follows selection
  writes made elsewhere.
- Layout (#50): `ZStack` overlays the rows of a `ForEach`, `For` or `Show`
  (the wrapper becomes an overlay cell; rows added later follow a
  `[data-zstack-layer]` rule in `base.css`). `frame(alignment:)` positions
  content inside the frame (`.frame({ width, height, alignment:
  'bottomTrailing' })`). `LazyVStack` and `LazyHStack` are lazy: a row's
  view is built when it nears the viewport and kept, as in SwiftUI; without
  `IntersectionObserver` (and in static rendering) every row renders.
- One view model (#48). `Toggle`, `Slider`, `Stepper`, `TextField`,
  `SecureField`, `Picker`, `DatePicker` and `ColorPicker` return view
  descriptors with the full modifier table plus their own methods
  (`toggleStyle`, `pickerStyle`, `textFieldStyle`, …, usable after any
  modifier). They render through `Renderer.render`, so ordered modifier
  layers, owned reactive modifiers and static rendering apply to them. The
  `*View` classes stay exported for one minor release; code that read a
  factory result's internals (`Toggle(...)._label`) should construct the
  class instead. Every descriptor view shares one modifier table
  (`src/Core/Chainable.js`) instead of eight drifting copies, and the dead
  `Core/ViewFactory.js` and `Core/index.js` are removed.
  `NavigationSplitView`, `Label`, `WindowGroup` scenes and `ViewBuilder`
  render descriptor content too.
- Security: `NavigationLink`'s `url` accepts only relative URLs and
  `http:`, `https:`, `mailto:` and `tel:`. A `javascript:`, `data:` or other
  scheme (including ones disguised with whitespace or case) is dropped with
  a warning and the link renders as a button, so a URL built from user data
  can't run script.
- `ScrollView`, `LazyVStack`, `LazyHStack`, `Grid`, `Form`, `ViewThatFits`,
  `WindowGroup` and `DisclosureGroup` keep a view descriptor passed as their
  first argument (`ScrollView(VStack(…))`); they used to read it as options
  and render nothing. `LazyVStack`, `LazyHStack` and `ViewThatFits` also
  render descriptor children.
- Release build (#41): application builds add `<link rel="modulepreload">`
  for every module the page's scripts import statically. `--hash` renames
  each emitted file to `name.<hash>.ext` (the hash covers the file and
  everything it reaches, so a change anywhere below renames it), rewrites
  the import, `new URL(…, import.meta.url)`, CSS and HTML references, and
  writes `manifest.json`. Names are deterministic.
- Release build (#41): a token-aware JavaScript minifier
  (`scripts/minify.js`) copies strings, template literals with nested
  `${…}` and regular-expression literals verbatim, removes comments, and
  keeps a line break wherever whitespace contained one, so automatic
  semicolon insertion is unchanged. The old minifier mistook a quote or
  `//` inside a regex for a string or comment. `--no-minify` keeps files
  readable (still tree-shaken). `scripts/build-tests.js` now runs the unit
  suite against the optimized library as a gate.
- Progressive activation (#39): `App(view).mount(host, { mode: 'replace' })`
  keeps the host's static fallback until the view is rendered off-document,
  swaps them in one step (`replaceChildren`) and holds the host's height
  until the next frame, so there is no layout shift. A new
  `swiftui-for-web/islands` entry exports `whenVisible(host, load)`, which
  loads an island once its host nears the viewport and imports no framework
  code itself. The README documents the static-trigger pattern (the island
  exports a `State` that page buttons write).
- Presentations share one controller (#38): `.fullScreenCover(isPresented,
  content)`, `.alert(title, isPresented, { actions, message })` and
  `.confirmationDialog(title, isPresented, { titleVisibility, actions,
  message })` join `.sheet`, all on `<dialog>.showModal()` (inert page,
  focus trap). The controller locks page scroll while anything is
  presented, returns focus to the presenter, stacks nested presentations,
  and puts `dismiss` in the presented content's environment
  (`Environment.get(EnvironmentValues.dismiss)`). The binding is the single
  source of truth: Escape, a backdrop click (not for an alert) and actions
  write `false`, and `onDismiss` runs once. An alert is
  `role="alertdialog"` labelled by its title and described by its message;
  actions follow SwiftUI roles (`Button('Delete', { role: 'destructive' },
  action)` or `{ title, role, action }`), and Escape runs the `cancel`
  action. With no actions, one "OK" button is shown.
- Every runtime export now has a declaration (#47): the 76 names that were
  allowed untyped in `scripts/types-baseline.json` (legacy `*View` classes,
  gesture recognizers, `AppInstance`, `ColorValue`, `FontValue`, scheduler
  lanes and functions, the element pool, event delegation and the `extend*`
  installers) are declared in `src/core.d.ts`, and the baseline list is
  empty, so `check-package` fails on any new untyped export.
- Size budget (#53): `npm run size` and CI fail when the gzipped `dist/`
  total passes 120 KB (`node scripts/size.js dist --budget-gzip-kb 120`).
- GitHub Pages publishes only the site (#53): `index.html`, `README.md`,
  `AGENTS.md`, `docs/`, `Examples/` and the `src/` the examples import, not
  the whole repository.
- Render errors name the view (#42): an error thrown while rendering a view
  or applying one of its modifiers is rethrown as
  `SwiftUI-For-Web: Text.padding() failed to render: …`, with the original
  error as `cause`. In development builds the message also gives where the
  view was created (the first stack frame outside the framework), captured
  when the descriptor is built; the optimized build skips the capture.
- More HTML snapshots through `renderToString` (#42): accessibility
  modifiers, `searchable` with `sheet`, and order-dependent modifier chains.
- `Menu` renders view-descriptor items (#48): `Button(...)` items run their
  action and close the menu (a disabled one is `aria-disabled`), and
  `Divider()` is a separator. They were silently dropped, because the
  item code only handled `ButtonView`/`DividerView` classes that no longer
  exist; that dead code is gone.
- `DisclosureGroup` follows writes to its `isExpanded` binding made elsewhere
  (an "Expand all" button, for example), renders view-descriptor content and
  labels, and accepts a plain string or a view as `label` (#48).
- Modifier order has SwiftUI meaning for descriptor views (#50). Modifiers
  apply in declaration order, and a modifier whose meaning depends on an
  earlier one gets its own wrapper layer: `.background(c).padding(8)` pads
  outside the background, `.padding(8).padding({ top: 4 })` adds up, a second
  `frame` wraps the first, and a repeated `opacity` multiplies. Chains where
  order can't change the result stay on one element. A layer takes over the
  view's placement in its stack (flex growth, alignment, grid area).
- `Button(…).onTapGesture(f)` runs both the action and `f`: handlers for the
  same event compose in modifier order (#50).
- `frame(maxWidth: Infinity)` and `frame(maxHeight: Infinity)` fill along a
  stack's axis with flex growth (sharing space with `Spacer`s) and stretch
  across it; outside a stack they take 100%. `frame` uses
  `box-sizing: border-box`, so padding followed by a frame no longer
  overflows (#50).
- `Spacer(minLength:)` sets the minimum length on its stack's axis only (#50).
- `ForEach` is reactive and keyed (#52): given a `State`, a `Binding` or a
  function returning the array, it renders through the keyed `For` renderer,
  so rows with a stable id keep their DOM when the data changes. A plain
  array stays static. `For` is deprecated in favour of `ForEach` (it stays
  for one minor release).
- Development warning (#52): reading `State.value` while building a view,
  outside any reactive scope (the `Text(count.value)` mistake), logs a warning
  once per call site. It is on in the source tree and compiled out of the
  optimized build (`DEV_BUILD` in `src/Core/Dev.js`).
- Static rendering (#40). A new `swiftui-for-web/server` entry renders views
  to HTML in Node with no browser: `renderToString(view)` returns the markup
  of the view's first render, and `renderDocument(view, options)` a full
  document. The framework's own renderers run against a small DOM-like shim
  (`src/Server/DOMShim.js`), so there is no second HTML implementation to
  drift. Output is deterministic: attributes and styles keep their order,
  ARIA ids restart per render (`src/Core/ElementID.js`), animation frames
  and timers never run, and element pooling is off during the render.
  Scene-level `DocumentMetadata` (title, description, canonical, robots,
  Open Graph, Twitter card, JSON-LD), passed to `WindowGroup({ metadata })`
  or `renderDocument`, escapes every value, rejects non-http(s) URLs and bad
  robots directives, and serializes JSON-LD so it can't close its
  `<script>`. `sitemap(routes, { baseURL })` writes sitemaps.org XML.
  Snapshot tests live in `Tests/Server`.
- `List` selection works and is accessible (#51). A selectable list is a
  WAI-ARIA `listbox` whose rows are `option`s with `aria-selected` and a
  roving `tabindex`; ↑/↓, Home and End move focus and Space (or a click)
  selects. A `Set` selection toggles rows and sets `aria-multiselectable`.
  Selection used to do nothing: `List(data, { selection }, row)` ignored the
  binding, and `List({ selection }, …children)` had no row ids. Rows now take
  their id from the data's id key path, or from a child's `.tag(_:)`.
- `TabView` follow-ups (#51): when the selection matches no tab, the first
  tab keeps the Tab stop. The page-style `TabView` follows the tabs pattern
  too: its page dots are `<button role="tab">`s ("Page 2 of 3") with
  `aria-selected`, `aria-controls` and a roving `tabindex` in a `tablist`
  (←/→ wrapping, Home, End), each page is a `tabpanel`, and off-screen pages
  are `inert` and `aria-hidden`. It also renders view-descriptor pages now.
- `NavigationLink` is a native element (#51): a `<button type="button">`, or
  an `<a href>` when it is given `{ url }`, so it is focusable and Enter
  activates it. A plain click on a URL link navigates in place; a modified
  or middle click is left to the browser (open in a new tab). Clicking a
  `NavigationLink` also pushes again: the link used to look up its stack at
  click time, after the render-time context was gone, so it did nothing.
  The label now sits inside a button or link, so it should not contain other
  interactive views (a `Button`, `Toggle` or another link).
- The segmented `Picker` is a WAI-ARIA radio group (#51): the container has
  `role="radiogroup"` and is labelled by the picker's title; each segment is a
  `<button type="button" role="radio">` with `aria-checked` and a roving
  `tabindex`, so it takes one Tab stop. ←/→ and ↑/↓ (both wrapping), Home and
  End move to a segment and select it. Its colors come from theme tokens
  (`--color-fill-tertiary`, `--color-segmented-selected`, `--color-primary`,
  new in `base.css` with dark-mode values) instead of hard-coded light colors.
- The tab-bar `TabView` follows the WAI-ARIA tabs pattern (#51): the bar is a
  `tablist`, each button a `tab` with `aria-selected`, `aria-controls` and a
  roving `tabindex`, and the content area a `tabpanel` labelled by the
  selected tab. ←/→ (wrapping), Home and End move to a tab and select it.
- `DisclosureGroup` and `Menu` expose their state (#51). The disclosure
  header reports `aria-expanded` and `aria-controls`; `Menu` follows the
  menu-button pattern (`aria-haspopup="menu"`, `aria-expanded`,
  `role="menu"`, `role="menuitem"`, `role="separator"` for dividers).
  Opening the menu focuses its first item; arrow keys, Home and End move
  between items, Enter and Space activate one, and Escape, Tab or closing
  returns focus to the button.
  Collapsed content and a closed menu are `inert` and `aria-hidden`, so they
  are no longer reachable by Tab or read by screen readers while hidden.
- `TextField` (plain style), `Picker` (menu), `Slider` and `DatePicker` no
  longer set an inline `outline: none`, which hid the keyboard focus ring.
  The `:focus-visible` rule in the stylesheets now applies (#51).
- The switch-style `Toggle` is accessible (#51). Its track is a native
  `<button role="switch">` with `aria-checked` following the binding, named
  by its label through `aria-labelledby`. It is focusable, Space and Enter
  toggle it, and a disabled toggle is a disabled button. It used to be a
  `<div>` with a click handler only.
- `.environment(key, value)` and `.environmentObject(object)` apply to the
  modified view and its descendants (#49). `.environment` was a no-op, and
  `.environmentObject` set one app-wide object, so the last writer won.
  Sibling subtrees now read their own values and nested values shadow outer
  ones. `Text`, the stacks and `Button` gain both modifiers; legacy views
  scope their own render. Values are read at render time (thunks, effects,
  content rendered by the view). `environmentObject` still registers the
  object app-wide as a fallback for reads outside any render. Scoped values
  reach content in `Show`, `For`, `TabView` and `NavigationStack`. A plain
  scoped value is fixed for that render; pass a `State` to make readers update.
- `frame(maxWidth: Infinity)` and `frame(maxHeight: Infinity)` (or the string
  `'infinity'`) fill the available space, like SwiftUI's `.infinity`. They
  used to emit `infinitypx`, which CSS ignores (#50). Frame lengths also
  accept CSS strings such as `'4rem'` or `'50%'`; legacy views used to append
  `px` to them. Descriptor and legacy views share one implementation
  (`src/Core/Frame.js`).
- `npm run validate` runs every local check in one command: `npm test`, the
  browser tests, the production build and the size report (#42).
- `TabView` selects tabs by a descriptor's `.tag(_:)` value, everywhere it
  reads a tag (#48).
- The menu-style `Picker` keeps a number tag as a number when the user picks
  an option; before, it stored the option's string value, so the selection
  stopped matching.
- Legacy containers render view descriptors (#48): `NavigationStack(VStack(…))`,
  descriptor screens pushed onto it, descriptor `NavigationLink` labels, and
  descriptor content in `WindowGroup` and `Settings` used to render nothing.
- `Text(…).tag(value)` exists, and `Picker` keeps descriptor options such as
  `Text('Vanilla').tag('vanilla')` instead of dropping them (#48).
- Importing the library no longer needs a browser (#49). The environment
  store creates its system defaults (color scheme, locale, reduced motion,
  layout direction, size classes, `openURL`) on first use instead of at
  import, and falls back to fixed defaults without `window`, `document` or
  `navigator`. `scripts/check-package.js` now imports every entry in plain
  Node with no browser stub.
- `openURL` opens links with `noopener,noreferrer`.
- Signal-as-value (#52, `docs/adr/0001-reactivity.md`): `Text(state)`,
  `Text(binding)` and style modifiers given a `State` or `Binding`
  (`.opacity(isVisible)`, `.foregroundColor(color)`, `.padding(spacing)` and
  others) update on their own, with no thunk. `Text(state.value)` is still a
  static snapshot.
- The export lists move to `src/exports.js` and `src/core-exports.js`. The
  entries `src/index.js` and `src/core.js` re-export them and build their
  default export from the same list, so it is the only one to maintain (no
  self-import, so bundling the entry with Rollup still works). The default namespace's members are read-only getters for the
  same values, and it now also includes the `extend…` helpers (#47).
- Type declarations for `GeometryProxy` (now a class, as at runtime),
  `ViewBuilder`, `TupleView`, `ConditionalContent`, `Empty`, `Any`,
  `UnevenRoundedRectangle`, `Bindable`, `NavigationDestination`,
  `CodableRepresentation`, and `NavigationPath.codable`. The untyped-export
  baseline shrinks from 86 to 76 names (#47). `withObservationTracking` and
  `ObservationTracking` stay untyped: `withObservationTracking` does not yet
  call its `onChange` argument.
- The default export's type (`import SwiftUI from …`) is now derived from the
  declared named exports, so it lists every typed view and modifier instead of
  a hand-kept subset of about 90, and it includes Charts for the main entry
  (#47).
- `swiftui-for-web/core` has its own type declarations (`src/core.d.ts`), so
  importing a Charts name from it is now a type error instead of a load-time
  failure. `scripts/check-package.js` checks `./core` declarations against the
  `./core` runtime (#47).
- A `.task(id:_:)` rendered outside a reactive owner now triggers the
  unowned-render warning, since it cannot restart when `id` changes. A task
  without an id still needs no owner.
- **Deprecation:** the performance internals exported from the main entry
  (`acquireElement`, `releaseElement`, `releaseTree`, `clearPools`,
  `getPoolStats`, `batchUpdates`, `endBatch`, `enqueueDOMWrite`,
  `scheduleWork`, `schedulePostFlush`, `getSchedulerStats`,
  `resetSchedulerStats`, `promoteToGPULayer`, `demoteFromGPULayer`,
  `initDelegation`, `teardownDelegation`, `delegateEvent`, `undelegateEvent`,
  and the scheduler lanes `SyncLane`, `DiscreteLane`, `DefaultLane`,
  `TransitionLane`, `IdleLane`)
  will leave the main entry in the next major release. Import them from
  `swiftui-for-web/internal/*` if you depend on them (#47).
- Add `.task(_:)` and `.task(id:_:)`: asynchronous work that starts when a view
  appears, is cancelled when it disappears, and restarts when `id` changes
  (#37). The action receives an `AbortSignal`.
- Several `.onAppear` or `.onDisappear` modifiers on one view now all run;
  before, the last one replaced the others.
- Fix the `swiftui-for-web/core` entry, which failed to load. It now exports
  everything the main entry does except Charts (#47).
- **Breaking:** `swiftui-for-web/src/*` is no longer importable. Use the main
  entry, `./core`, or `./charts`. Stylesheets are at `swiftui-for-web/styles/*`.
  Any other module is reachable under `swiftui-for-web/internal/*`, which is
  unstable and can change in any release (#47).
- Type declarations: `Text(() => …)`, `Show`, `For`, `effect`, `untrack`,
  `batch`, `flushSync`, and the Charts API are declared from the main entry;
  `Chart(…)` and the marks can be called without `new`; `Binding.property`,
  `transform`, `index`, and `constant` replace the nonexistent `project`;
  `NavigationStack` and `NavigationLink` match the runtime signatures.
  Declarations of members that never existed (`offset`, `position`,
  `ObservableObject.objectWillChange`, `Observable.create`,
  `AnyTransition.offset`, `chartOverlay`, the `ButtonStyle` and `ToggleStyle`
  constants) are removed; the two styles are string-union types (#47).
- `sideEffects` lists `Picker.js` and `TabView.js`, which add `View` modifiers
  when imported, and the stylesheets (#47).
- `onAppear` and `onDisappear` process only the DOM subtrees a change added or
  removed, instead of checking every registered element on every change (#57).
- A shader effect applied twice to one view is no longer repeated in the
  element's filter list.
- `npm test` also runs the DOM-free `Tests/**` suites and the package checks.
  `npm run test:browser` runs `Tests/TestRunner.html` headless (#53).

## 2.0.0-alpha.1

- Add SwiftUI-style `.onChange(of:initial:_:)` behavior.
- Add `.searchable(text:placement:prompt:)` with two-way `Binding` updates.
- Add `.sheet(isPresented:onDismiss:content:)` backed by an accessible native dialog.
- Add `accessibilityLabel`, `accessibilityValue`, `accessibilityHint`, and
  `accessibilityIdentifier` modifiers.
- Align the package, runtime, declarations, and documentation version.

Web compatibility note: search placement values are currently styling hints.
The search field is inserted before the modified view's content because the web
platform has no universal navigation-bar placement equivalent.
