# ADR 0001: Reactivity model

- **Status:** Accepted (2026-11-22, maintainer approval on #43)
- **Issue:** #52
- **Scope:** every public view and modifier API

## Context

SwiftUI re-evaluates a view's `body` and diffs by identity. SwiftUI-For-Web
uses fine-grained signals instead: a view function runs once per instance, and
only the effects that read a changed signal re-run. That is a good fit for the
DOM, but it differs from SwiftUI in ways that were undocumented and easy to
get wrong, for example `Text(count.value)` silently never updating.

## Decision

1. **Signal-as-value.**
   - Views and style modifiers accept a `State` or `Binding` directly, for example `Text(count)` and `.opacity(isVisible)`, and subscribe on their own. Today that is `Text` and the style modifiers in the table below; other views follow as #48 migrates them.
   - Thunks are only for derived expressions, such as ``Text(() => `${count.value} items`)``.
   - A plain value such as `Text(count.value)` is a static snapshot, which is the correct meaning of that code.
2. **Control flow.**
   - A reactive, keyed `ForEach(data, { id }, content)` becomes the primary list API. `For` stays as a deprecated alias for one minor release.
   - `Show(condition, then, else?)` stays as the documented replacement for `if`/`else`, because a library can't observe a JavaScript `if`.
   - There is no `switch` helper: nest `Show`, or look up a derived value in a map.
3. **State ownership: no new API.**
   - A view function body runs once per instance, so `new State()` inside it is per-instance, like `@State`.
   - State at module scope is shared, like an app-level `@StateObject`.
4. **Development warning.**
   - Development builds warn once per call site when `State.value` is read outside a tracking scope while a view is being built.
   - This needs a development/production switch, which the framework doesn't have yet, so it ships with the diagnostics work in #42.

## Status of each part

| Part | Status |
|---|---|
| `Text(state)` and `Text(binding)` | Done |
| Style modifiers (`padding`, `frame`, `foregroundColor`, `background`, `font`, `opacity`, `cornerRadius`, `shadow`, `accessibilityLabel`, `accessibilityValue`, `accessibilityHint`) accept a `State` or `Binding` | Done |
| Reactive keyed `ForEach`, with `For` as an alias | To do, together with #48 |
| Development warning | To do, together with #42 |

## Consequences

- To do: add the run-once body, `ForEach`, and the per-instance meaning of `new State()` inside a view function to the README's SwiftUI mapping table (it has a `Show` row today).
- The divergence from a re-evaluated `body` stays a documented exception in ARCHITECTURE §5.
- A modifier given a `State` without a reactive owner applies once and logs the existing unowned-render warning, the same as a `Text` thunk does.
- When its value changes, a State-driven modifier first restores the style properties and attributes its previous value wrote, so nothing stale is left behind.
- Known limitation until #50: modifiers still write onto one element, so in `.padding(state).padding(16)` a change to `state` overwrites the later static `16`. #50's ordered layering fixes this.
