# Changelog

## Unreleased

- **BREAKING: every built-in view is a descriptor; one view model** (#48).
  The containers, navigation, shapes and the rest of the former `View`
  subclasses now build descriptors with `chainable(createDescriptor(...))`
  and register their own renderers, like `Text` and the form controls:
  `List`, `Section`, `Form`, `ScrollView`, `Group`, `DisclosureGroup`,
  `NavigationStack`, `NavigationLink`, `BackButton`, `NavigationSplitView`,
  `TabView`, `Menu`, `Label`, `Image` (and `Image.systemName`), `Rectangle`,
  `RoundedRectangle`, `Circle`, `Ellipse`, `Capsule`, `Path`,
  `UnevenRoundedRectangle`, `Grid`, `GridRow`, `LazyVGrid`, `LazyHGrid`,
  `LazyVStack`, `LazyHStack`, `GeometryReader`, `ViewThatFits`,
  `WindowGroup`, `Settings`, `DocumentGroup`, `LinearGradient`,
  `RadialGradient`, `AngularGradient`, `EmptyView`/`Empty` and
  `AnyView`/`Any`. Factory signatures, DOM, styles, ARIA and keyboard
  behaviour are kept; each view's own methods (`.listStyle`, `.fill`,
  `.resizable`, `.tabViewStyle`, …) return new descriptors, and every view
  has the whole shared modifier table.
  - Removed classes (named exports, the default namespace and `core.d.ts`):
    `ListView`, `SectionView`, `FormView`, `ScrollViewView`, `GroupView`,
    `DisclosureGroupView`, `TabViewView`, `MenuView`, `LabelView`,
    `ImageView`, `ShapeView`, `RectangleView`, `RoundedRectangleView`,
    `CircleView`, `EllipseView`, `CapsuleView`, `PathView`,
    `UnevenRoundedRectangleView`, `GridView`, `GridRowView`,
    `LazyVGridView`, `LazyHGridView`, `LazyVStackView`, `LazyHStackView`,
    `GeometryReaderView`, `WindowGroupView`, `SettingsView`,
    `DocumentGroupView` and `TupleView` (`ViewBuilder.buildBlock` returns a
    `Group`). `ConditionalContent` is now a function, not a class.
  - Removed functions: `extendViewWithAnimation` and
    `extendViewWithGestures` (the legacy `View` has these modifiers built
    in) and `extendNavigationStackWithPath` (it never worked; use the
    `path` option below).
  - Removed instance APIs with no descriptor equivalent: `ScrollView`'s
    `scrollTo`, `scrollToTop` and `scrollToBottom`; the class-only
    `getElement`/`rerender`/`_render` on the built-in views (render with
    `render(view)` or mount them); `View._printChanges`, `_logChanges`,
    `trackChanges` and `src/Core/ChangeTracker.js`; the `ProposedViewSize`
    helper class of `ViewThatFits.js`; and the setter-only
    `TabView._pageIndicatorVisibility`, replaced by
    `.tabViewStyle(TabViewStyle.page, { indexDisplayMode: 'never' })` (SwiftUI's
    `.page(indexDisplayMode: .never)`).
  - Removed the sub-module barrels `src/View/index.js`,
    `src/View/{Container,Control,List,Navigation}/index.js`,
    `src/Layout/index.js` and `src/Layout/Stack/index.js`: nothing imported
    them and none of them loaded (they re-exported names that no longer
    existed).
  - `View` (`src/Core/View.js`) stays only as a deprecated adapter for
    user-defined class views: `class MyView extends View { body() { … } }`
    still renders, and its modifiers are now the descriptor modifiers,
    applied by the same renderer code (ordered layers included). Its
    `.tag(_:)` is a TAG modifier, read by `List`, `Picker` and `TabView`.
    Development builds warn once when a class extends it.
  - Behaviour changes: `TabView` follows writes to its selection binding
    made elsewhere, in both styles, and takes a descriptor as its first tab
    when there is no selection (it dropped it before). `NavigationStack(root,
    { path })` follows a `NavigationPath`, building screens with
    `.navigationDestination(dataType, build)`; `pop`, `popToRoot` and
    `BackButton` edit the path. `BackButton` now finds its stack (it read the
    stack only during render before, so a click did nothing). `Menu` renders
    a descriptor label from `{ label: () => View }`, implements
    `.primaryAction(_:)` (a tap runs it, a secondary click opens the menu),
    and removes its document listeners when its owner is disposed.
    `NavigationSplitView` disposes the content it replaces (layout changes,
    `navigate(view)`) and removes its resize and size-class listeners;
    `ViewThatFits` renders its candidate through an owned slot and measures
    candidates in a throwaway root, so measuring creates no lasting effects.
    `Group` is transparent to the enclosing stack, as in SwiftUI: a `Spacer`
    inside a `Group` in an `HStack` is horizontal. `Capsule` always uses
    `border-radius: 9999px` (CSS caps it at half the shorter side), so it no
    longer reads its `.frame` height. Built-in views are tagged with
    `data-view` like the other descriptors (for example `data-view="Image"`,
    `data-view="WindowGroup"`); the server snapshot `document.html` and
    `Examples/AppleSampleCodeProof/out/index.html` changed only by that
    attribute on the `WindowGroup` element.
  - Migration: build views with the factory functions and keep the
    returned descriptor (`const stack = NavigationStack(Root());
    stack.push(Detail())` still works). Replace `new XView(...)` with
    `X(...)`, `view._render()` with `render(view)`, `x instanceof XView`
    with `x.type === 'X'`, and `ScrollView(...).scrollTo(...)` with a
    `.modifier((element) => …)` that keeps the element and scrolls it.
  - Size: the gzipped total went from 118.7 KB to about 112 KB.

- Gesture composition (#50): `.simultaneousGesture(_:including:)`,
  `.highPriorityGesture(_:including:)` and `.gesture(_:including:)` with
  `GestureMask` (`all`, `gesture`, `subviews`, `none`), on every descriptor
  view and the legacy `View`. A high-priority gesture wins over gestures of
  the same kind on the view and inside it: a high-priority tap on a parent
  beats a child's `TapGesture` and `.onTapGesture`, and a high-priority drag
  keeps a child drag from starting. A simultaneous gesture recognizes
  together with the view's own gestures. Arbitration is a check each
  recognizer makes before it starts or fires; it costs nothing until a view
  uses one of these modifiers. Limitations are listed in
  `docs/parity-audit.md`.
- Removal transitions (#50): a view with `.transition(_:)` that Show, For (or
  a reactive `ForEach`) or a NavigationStack pop removes stays in the
  document while its removal animation runs (opacity, scale, slide, move,
  and the removal half of `AnyTransition.asymmetric`), then is removed and
  released. Its effects are disposed at once; the lingering element takes no
  pointer events and is `aria-hidden`. Removal animates inside
  `withAnimation` or when the transition carries an animation
  (`AnyTransition.opacity.animation(...)`). With `prefers-reduced-motion`,
  no transition or no animation, removal stays immediate and synchronous.
- `.navigationTitle` now updates when its view is attached after the render
  (from a frame, a timer or after an `await`): an entry whose view isn't in
  the document yet is checked again when it appears, through the shared
  lifecycle observer, and the watcher is dropped when the view is disposed.
  `cancelAppear(element, callback)` can drop a single callback.
- Fixed: `withAnimation` resolved (and ran its completion) right after its
  first two frames instead of after the animation, because it added the
  `delay()` method instead of the delay value; `animateStyles`' CSS fallback wrote the method
  into the transition string the same way.
- AppleSampleCode proof case (Refs #40): `Examples/AppleSampleCodeProof`
  renders AppleSampleCode's Core NFC framework collection page with
  `renderDocument`, and `Tests/Server/AppleSampleCodeProofTests.js` checks
  it against the Python renderer's output for the same page: metadata,
  JSON-LD, headings, links, landmarks, lists, tables and all 293 visible
  words match.
- `mount(host, { mode: 'adopt' })` now hydrates (#39): the view renders onto
  the server's DOM nodes instead of swapping in a new tree. While the client
  render runs, element creation (`acquireElement`, `document.createElement`,
  `createElementNS`) claims the matching server element, so effects,
  delegated handlers, lifecycle callbacks, gesture listeners and the element
  references their closures capture all belong to the server's nodes. A
  claimed element is emptied first and rebuilt by its renderer, so the
  resulting DOM is always the client's tree; elements that don't match (a
  different tag, or outside the enclosing view's element) are created fresh,
  and development builds still warn at the first difference. Focus, a
  field's selection and scroll offsets are kept on the reused nodes.
  Comments and whitespace text in the markup are ignored. `replace` mode and
  the default mount are unchanged.
- Descriptor views gained the modifiers that only legacy `View` classes had
  (#48, #50), so nothing that worked before the descriptor migration is
  missing. Every descriptor view (`Text`, `Button`, stacks, the form
  controls, …) now has `.animation(_:value:)`, `.transition(_:)`,
  `.matchedGeometryEffect(id:in:isSource:)`, `.gesture(_:)` (with
  `TapGesture`, `LongPressGesture`, `DragGesture`, `MagnificationGesture` and
  `RotationGesture`), `.onLongPressGesture(_:options)`, `.onDrag(onChanged,
  onEnded)`, `.mask(_:alignment)` and `.contentShape(_:)`, from the shared
  table in `Chainable.js`. They reuse the implementations in `src/Animation`
  and `src/Gesture`, which the legacy `View` methods now call too. Gesture
  listeners are removed when the element is released or its owner is
  disposed, and each element keeps its own gesture state (one recognizer can
  sit on every row of a list). `.mask` and `.contentShape` take part in the
  ordered modifier layers: a background, border, padding or shadow after a
  mask goes outside it. `.mask` now also accepts gradients (mask-image), and
  `.contentShape(Rectangle())` no longer clips drawing. `Picker`, `Stepper`,
  `DatePicker` and `ColorPicker` now show binding writes made elsewhere, and
  `.clipShape(RoundedRectangle(...))` uses the shape's radius (it read the
  `cornerRadius` method). The audit is in `docs/parity-audit.md`.
- **BREAKING (3.0.0-alpha.2): the form controls are native descriptors and
  their classes are gone** (#48). `Toggle`, `Slider`, `Stepper`,
  `TextField`, `SecureField`, `Picker`, `DatePicker` and `ColorPicker` now
  build view descriptors with their own renderers, like `Text` and `Button`.
  Removed:
  - the classes `ToggleView`, `SliderView`, `StepperView`, `TextFieldView`,
    `SecureFieldView`, `PickerView`, `DatePickerView` and `ColorPickerView`,
    from `swiftui-for-web`, `swiftui-for-web/core`, the default `SwiftUI`
    namespace and `core.d.ts`;
  - `src/Core/LegacyControl.js` (`defineControl`);
  - the unused descriptor hashing (`_selfHash`, `_hash`),
    `descriptorsEqual`, `memo` and `isMemoized` in `ViewDescriptor.js`.

  Migration: call the factories, which take the same arguments (a label
  string, a label view, a binding or an options object). Their own methods
  (`toggleStyle`, `tint`, `disabled`, `pickerStyle`, `textFieldStyle`,
  `onCommit`, `keyboardType`, `datePickerStyle`, …) and every shared modifier
  still chain in any order, but each call returns a new descriptor instead of
  mutating the view. Render a control with `render()` or mount it; don't read
  internals such as `._label`.

  ```js
  // before
  const element = new ToggleView('Wi-Fi', isOn.binding).toggleStyle('checkbox')._render();
  // after
  const element = render(Toggle('Wi-Fi', isOn.binding).toggleStyle('checkbox'));
  ```

  Also fixed on the way: `Slider`'s minimum/maximum value labels render descriptor views (they
  rendered only legacy Views), and `SecureField({ onCommit })` keeps the
  callback from the options object. Rendered markup is unchanged; the server
  snapshots didn't move. The package version is now `3.0.0-alpha.2`.
- **BREAKING (3.0.0-alpha.1): performance internals left the main entry**
  (#47). The scheduler (`scheduleWork`, `schedulePostFlush`,
  `batchUpdates`, `endBatch`, `enqueueDOMWrite`, `getSchedulerStats`,
  `resetSchedulerStats`, the `SyncLane`…`IdleLane` constants), the element
  pool (`acquireElement`, `releaseElement`, `releaseTree`, `getPoolStats`,
  `clearPools`), event delegation (`delegateEvent`, `undelegateEvent`,
  `initDelegation`, `teardownDelegation`) and `promoteToGPULayer` /
  `demoteFromGPULayer` are no longer exported from `swiftui-for-web` or
  `swiftui-for-web/core`, nor on the default `SwiftUI` namespace. `batch`
  and `flushSync` stay. Migration: import them from the new entry,

  ```js
  // before
  import { scheduleWork, SyncLane, acquireElement } from 'swiftui-for-web';
  // after
  import { scheduleWork, SyncLane, acquireElement } from 'swiftui-for-web/performance';
  ```

  The package version is now `3.0.0-alpha.1`.
- `mount(host, { mode: 'adopt' })` (#39) takes over server markup from
  `renderDocument`: it swaps in the client tree in one step with the host's
  size held, moves focus to the matching element, and in development warns
  at the first difference between the server markup and the client tree
  (tags, text and attributes, ignoring style and generated ids). It doesn't
  reuse the server's nodes yet.
- `.navigationTitle(_:)` (#40) sets the document title while its view is
  shown and restores the previous one when the view goes away (a popped
  screen, a closed branch); a `State` or `Binding` title stays in sync.
  `renderDocument` uses it for a missing metadata title, before the
  `WindowGroup` title.
- In-place update benchmark (#53): `Tests/Benchmark/updates.html` measures
  the js-framework-benchmark scenarios as `State` writes on one mounted app
  (no remounts); `npm run bench` runs it in headless Chrome in real time and
  prints the medians. `Tests/Benchmark/RESULTS.md` leads with these numbers
  and marks the reconciler-era table as historical.
- `accessibilityValue` and `accessibilityHint` follow the #51 decision.
  The value is `aria-valuetext` only on range roles (slider, spinbutton,
  progressbar, meter, scrollbar); elsewhere it joins the accessible name,
  appended to an `aria-label` ("Silence, off") or as visually hidden text
  (`.swiftui-visually-hidden`). The hint is a hidden node referenced by
  `aria-describedby`, since `aria-description` isn't reliably announced;
  void elements (`input`, `img`, …), which can't hold that node, use
  `aria-description`.
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
- Release build (#41): `--bundle` scope-hoists an application's module
  scripts and their static imports into one ES module, `bundle.js`
  (`bundle.<hash>.js` with `--hash`), and rewrites `index.html` to load it.
  `scripts/bundle.js` (Node built-ins only) parses each module, resolves its
  scopes, and concatenates the modules in ES module evaluation order,
  renaming a top-level binding (and only the references that resolve to it)
  when it collides with another module's binding, a global the bundle reads
  or a local that would capture it. Imports become direct references, so
  live bindings, hoisting, temporal dead zones and cycles behave as between
  modules; namespace imports become frozen objects with getters; renamed
  classes and functions keep their `name`. Modules reached only through
  `import('literal')` go into `chunk-*.js` files grouped by the dynamic
  imports that reach them. `import.meta.url` and `new URL(…,
  import.meta.url)` keep pointing at the module's original location. The
  output is byte-for-byte deterministic, and `build-report.json` gains a
  `bundle` entry listing bundled modules and chunks. Top-level `await` and
  `eval` are rejected. `scripts/build-tests.js` bundles HelloWorld, Netflix
  and a fixture covering every import/export form, live bindings, a cycle,
  collisions and shadowing, and compares the fixture with the unbundled
  modules in Node; it also bundles the unit suite with every binding
  renamed and runs it.
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
