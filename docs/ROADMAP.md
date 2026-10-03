# Roadmap

This page records the current state (as of 2.0.0-alpha.1), the goals, and the
planned order of work. The live checklist is the tracking issue
[#43](https://github.com/ShawnBaek/SwiftUI-For-Web/issues/43). Update this file
whenever a phase completes or a goal changes.

## Goals

1. **Write websites in plain HTML, CSS, and JavaScript, with no setup.** No
   install, build, or compile step while developing, using SwiftUI's
   vocabulary.
2. **Ship small, fast production sites when you choose to.** The optional,
   dependency-free release build minifies and tree-shakes, and will gain
   bundling and content hashing.
3. **Be trustworthy enough for production.** Correct reactivity and cleanup,
   tests that run in CI, and accurate types and docs.
4. **Keep SwiftUI fidelity high**, with every unavoidable difference
   documented ([ARCHITECTURE.md § 5](ARCHITECTURE.md#5-documented-exceptions-to-swiftui)).

### Non-goals

- Runtime dependencies, or requiring a bundler, transpiler, or test framework
  for development.
- Inventing components SwiftUI doesn't have.
- Matching React or Solid APIs.

## Current state

### Strengths

- **No setup.** Native ES modules, no runtime or dev dependencies, and
  `npm test` finishes in about 2 seconds.
- **Familiar authoring.** SwiftUI-style modifier chains, and a Swift Charts
  API that reads almost like the original.
- **Fine-grained reactive core.** Owners and effects in the style of Solid
  (`Signal.js`), frozen descriptors, keyed `For` rows, and root-level event
  delegation with a synchronous batched flush.
- **Native semantics where they exist.** `<button>`, `<input type=range>`,
  `<select>`, `<h1>`–`<h6>` through `accessibilityHeading`, and
  `<dialog>`-based `.sheet` with focus management.
- **A working optional release build** (`scripts/build.js`), with its own
  build tests for reachability and tree shaking.
- **Proven in production** on AppleSampleCode.com (mobile Lighthouse 100,
  LCP 1.20 s, CLS 0).

### Weaknesses (verified in the October 2026 architecture review)

| Area | Problem | Issue |
|---|---|---|
| Reactivity | Thunks and reactive modifiers inside `Show`/`For` branches never bind, and stale effects write into detached nodes. | #44 |
| Robustness | A throwing effect drops the rest of the scheduler batch. Pooled elements keep stale handlers and lifecycle callbacks. | #45, #46 |
| Model | Two view systems (descriptors and legacy `View` classes). `NavigationStack(VStack(…))` renders nothing. | #48 |
| Environment | `.environment()` does nothing, `environmentObject` is global, and importing touches `window`. | #49 |
| Semantics | Modifier order is ignored, a second handler for the same event replaces the first, and `frame(maxWidth: 'infinity')` produces invalid CSS. | #50 |
| Packaging | The `./core` entry fails to load, `./src/*` exposes internals, and `index.d.ts` disagrees with the runtime. | #47 |
| Accessibility | Toggle, NavigationLink, and TabView lack roles, state, and keyboard support. | #51 |
| Tests and docs | Most tests never run in npm or CI. Benchmarks measure full remounts. README size numbers and scripts are stale. `CLAUDE.md` contradicts `AGENTS.md`. | #53, [TESTING.md](TESTING.md) |
| Concept | The divergence between "SwiftUI API" and the "body runs once" engine isn't documented. | #52 |

## Plan

Work happens in phases. A phase can start once the issues it depends on are
merged.

### Phase 0: Core correctness

Small, high-leverage fixes, each with a failing test written first.

- #44 Bind reactive thunks and modifiers during render, under the current owner.
- #45 Isolate effects in the scheduler.
- #46 Release delegated handlers and lifecycle callbacks when pooled elements are reused.
- #47 Fix the entries and exports, and add a `.d.ts`-versus-runtime check.
- #53 Run every existing test in CI, without adding dependencies.

**Exit criteria:** every test runs in CI, there are no known correctness bugs
in the reactive core, and every package entry loads.

### Phase 1: Architecture

- #52 RFC on the reactivity model versus SwiftUI. Decide before adding public API.
- #48 Move to one view model (descriptors) and delete the dead modules.
- #49 Scope the environment to the owner tree, and keep imports free of browser access.
- #50 Make modifier order follow SwiftUI semantics.
- #51 Make the controls accessible.

**Exit criteria:** invariants I1–I9 in
[ARCHITECTURE.md](ARCHITECTURE.md#3-invariants) hold, and each has a test.

### Phase 2: Features (from AppleSampleCode.com)

- #37 `.task` and `.task(id:)`
- #38 `.fullScreenCover`, `.alert`, `.confirmationDialog`, and remaining `.sheet` behavior
- #39 Progressive activation of server-rendered hosts
- #41 Release build: optional bundling, export-level tree shaking, safe minification, content hashing, a manifest, and incremental output. It stays dependency-free, and its output must pass the same tests as the source.
- #42 Diagnostics: component context in errors, and HTML snapshots
- #40 Static rendering and document metadata (largest item; the API proposal needs approval)

## Success measures

| Measure | Today | Target |
|---|---|---|
| Tests running in CI | 96 | Every test in `Tests/**` plus the node suites |
| Known core correctness bugs | 4 (#44–#47) | 0 |
| Invariants with a test | 0 / 10 | 10 / 10 |
| `.d.ts` agrees with the runtime | No | Checked in CI |
| Release build size budget | Reported only | Enforced in CI |
| Accessibility of controls | Partial | Every control passes keyboard and role checks |

## Updating this roadmap

- When an issue closes, update its row in "Current state" and the phase list.
- New work must name the invariant or goal it serves. Work that serves neither
  needs a discussion before it starts.
