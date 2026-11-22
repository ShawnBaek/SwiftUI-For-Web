# Changelog

## Unreleased

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
