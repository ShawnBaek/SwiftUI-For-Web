# Descriptor parity audit (#48, #50)

Rule: after the migration to descriptors, nothing that worked on legacy
`View` instances may be missing on descriptor views.

## Method

1. **Names.** A Node script imported `src/index.js` (which runs every
   `extend*` installer and prototype patch: animation, gestures, environment,
   Picker's `.tag`, TabView's `.tabItem`) and listed every public function on
   the `View.prototype` chain. It then listed the function keys of descriptor
   chains for `Text('x')`, `VStack(Text('x'))`, `Button('b', …)` and
   `Toggle('t', binding)`, and compared them.
2. **Behaviours.** The legacy control classes at `b4e4dd6`
   (`git show b4e4dd6:src/View/Control/*.js`, plus `src/Core/LegacyControl.js`)
   were compared with the native renderers from `f250512`, method by method
   and event by event: options and factory signatures, own chain methods,
   reactive updates, disabled state, styles, keyboard handling, callbacks,
   clamping, formatting, accessibility and label rendering.

## Counts

| | Count |
|---|---|
| Public methods on legacy `View` instances | 43 |
| Of those, present on every descriptor chain before this change | 31 |
| Missing chainable modifiers | 8 |
| Missing non-chainable legacy members (imperative API, not applicable) | 4 |
| Control behaviours lost in `f250512` | 4 (one per control: Picker, Stepper, DatePicker, ColorPicker) |
| Bugs found on the way | 1 (`clipShape(RoundedRectangle)`) |
| Missing after this change | 0 chainable modifiers, 0 control behaviours |

`NavigationStack.navigationDestination` is patched onto the NavigationStack
class only, not onto `View`, so it isn't part of this comparison.

## Modifiers

| Name | Legacy `View` | Descriptor before | Fix |
|---|---|---|---|
| `.animation(_:value:)` | `extendViewWithAnimation`: sets a CSS transition | Missing | `ModifierType.ANIMATION`, `animationModifier` in `src/Animation/Animation.js`, used by both. `.animation(null)` turns the transition off. |
| `.transition(_:)` | Insertion styles when inserted inside `withAnimation` | Missing | `ModifierType.TRANSITION`, `transitionModifier`. Restores the view's own styles (the legacy cleared them to `''`), and cancels its pending frame when the owner is disposed. |
| `.matchedGeometryEffect(id:in:isSource:)` | `view-transition-name` from the namespace | Missing | `ModifierType.MATCHED_GEOMETRY`, `matchedGeometryModifier`. |
| `.gesture(_:)` | `gesture._apply(element)`: Tap, LongPress, Drag, Magnification, Rotation | Missing | `ModifierType.GESTURE`, `gestureModifier` in `src/Gesture/Gesture.js`. Each `_apply` now keeps its state per element and returns a function that removes its listeners. The renderer runs that on element release (`onRelease` in `ElementPool.js`) and on owner cleanup. |
| `.onLongPressGesture(_:options)` | `LongPressGesture(options).onEnded(handler)` | Missing | `longPressGestureModifier`. |
| `.onDrag(onChanged, onEnded)` | `DragGesture` with both handlers | Missing | `dragGestureModifier`. The document-level mouse listeners are removed too. |
| `.mask(_:alignment)` | clip-path for `CircleView`, `EllipseView`, `RectangleView` only | Missing | `ModifierType.MASK`, `applyMask` in the renderer: clip-path for circle, ellipse, capsule, rounded rectangle and rectangle (shape views, descriptors or names), and mask-image for gradients. A new `mask` layer category: background, border, padding, frame or shadow after a mask go on an outer layer. |
| `.contentShape(_:eoFill:)` | Same as `clipShape` | Missing | `ModifierType.CONTENT_SHAPE`, `applyContentShape`: the box is hit-testable (`pointer-events: auto`), a rounded shape rounds it like `clipShape`. A rectangle no longer clips drawing, matching SwiftUI. |
| `simultaneousGesture`, `highPriorityGesture`, `gesture(_:including:)` | Not present | Not present | Added after the audit (#50), on descriptors and the legacy `View`: see [Gesture composition](#gesture-composition). |
| `body`, `getElement`, `rerender`, `trackChanges` | Imperative legacy API | Not present | Not applicable: descriptors are immutable and render through `render()`; there is no element to fetch or re-render in place. |

The other 31 names (`padding`, `frame`, …, `environment`, `tag`, `tabItem`,
`navigationTitle`, `modifier`, `id`) were already in the shared table.

## Control behaviours

| Control | Behaviour | Legacy (`b4e4dd6`) | Descriptor before | Fix |
|---|---|---|---|---|
| Picker (menu, segmented, inline, wheel) | Shows a selection written elsewhere | Followed indirectly: the selection was read tracked during render, so an enclosing effect re-rendered the parent | Read untracked, no effect: ignored | `followSelection` effect under the owner: menu sets `selectedIndex`, segmented moves `aria-checked` and the roving tabindex, inline moves the checkmark, wheel scrolls to the item |
| Stepper | End-of-range dimming follows the value | Same indirect follow | Ignored | `updateButtonStates` runs in an effect under the owner |
| DatePicker | Input shows the bound date | Same indirect follow | Ignored | Effect sets `input.value` |
| ColorPicker | Swatch, input and colour code show the bound colour | Same indirect follow | Ignored | One effect updates all three |
| Toggle, Slider, TextField, SecureField | Follow writes elsewhere | Effect | Effect | None needed |
| All eight | Options, signatures, own methods (`toggleStyle`, `tint`, `disabled`, `pickerStyle`, `textFieldStyle`, `onCommit`, `keyboardType`, `autocapitalization`, `disableAutocorrection`, `datePickerStyle`), DOM, ARIA, keyboard handling, clamping, formatting | Present | Present (ported line by line) | None needed |

Gaps that both versions share (not regressions, left for their own issues):
no `.disabled()` on Slider, Stepper, Picker, DatePicker or ColorPicker;
`datePickerStyle` and `supportsOpacity` are stored but unused; Slider's
`onEditingChanged` fires for mouse and touch only; Stepper's buttons have no
`aria-label`; the inline and wheel Pickers have no keyboard support.

## Bug found on the way

`clipShape(RoundedRectangle({ cornerRadius: 6 }))` on a descriptor wrote the
source of the Shape view's `cornerRadius()` method into `border-radius`,
because it read `value.cornerRadius` first. The radius lookup now accepts
numbers only.

## Tests

- `run-tests.js`, "Descriptor parity: restored legacy modifiers" and
  "Descriptor parity: controls follow binding writes made elsewhere", plus
  async checks for `.transition` inside `withAnimation` and
  `.onLongPressGesture` timing.
- `Tests/Core/GestureAnimationTests.js` in `Tests/TestRunner.html` (headless
  Chrome via `npm run test:browser`): real mouse and wheel events, computed
  transition and clip-path, listener release on unmount.

## Gesture composition

Added after the audit (#50). Each element records what it claims, and every
recognizer (and `.onTapGesture`) asks `gestureAllowed(element, kind,
priority)` in `src/Gesture/Gesture.js` before it starts or fires. Kinds are
`tap`, `longPress`, `drag`, `magnification` and `rotation`.

- `.highPriorityGesture(g)` wins over gestures of the same kind on the view
  (its `.gesture`) and inside it (every priority). A high-priority tap on a
  parent beats a child's `TapGesture` and `.onTapGesture`; a high-priority
  drag keeps a child drag from starting.
- `.simultaneousGesture(g)` recognizes together with the view's own
  gestures, including its high-priority one.
- `.gesture(g, { including: GestureMask.… })`: `gesture` disables the
  gestures inside the view, `subviews` disables `g`, `none` disables both.
- Claims are released with the gesture's listeners (element release or owner
  cleanup).

## Removal transitions

`.transition(_:)` now also animates removal (#50). Show, For (and a reactive
`ForEach`) and a NavigationStack pop without the stack's own animation keep
the removed view's element in the document while the transition's removal
styles animate (Web Animations, or a CSS transition where `animate` is
missing), then remove and release it. Effects are disposed at once; only the
element lingers, without pointer events and with `aria-hidden`. Removal
animates inside `withAnimation`, or when the transition carries an animation
(`AnyTransition.opacity.animation(...)`); with `prefers-reduced-motion`, no
transition or no animation, it is immediate and synchronous.

## Still missing

- Default exclusivity between plain `.gesture`s: a parent's and a child's
  `.gesture` of the same kind both fire (SwiftUI lets the child win). Use
  `.highPriorityGesture` or `GestureMask` to choose.
- A high-priority gesture takes the interaction even when it fails: a
  high-priority `TapGesture(2)` blocks a single tap of the same view or its
  subviews. SwiftUI would hand the tap on once the double tap fails.
- Gestures of different kinds don't arbitrate (a drag does not cancel a tap),
  and `Button` actions are not gestures here, so a high-priority tap on a
  parent doesn't stop a child `Button`.
- `SequenceGesture`, `ExclusiveGesture`, `.sequenced(before:)`,
  `.exclusively(before:)`, `@GestureState` and `.updating(_:body:)`.
- Insertion transitions still run only inside `withAnimation`; an animation
  attached to the transition animates removal only, so the first render and
  a hydrating render never start transparent.
- A NavigationStack push or pop with the stack's own slide or fade
  animation doesn't run the screen's `.transition`.
- Combined transitions that both set `transform` (`scale` with `move`) keep
  only the last one's transform.
