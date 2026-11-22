/**
 * Chainable - the one modifier table for view descriptors (#48).
 *
 * Every descriptor view (Text, Button, stacks, controls, …) gets the same
 * SwiftUI modifiers from here. Each call returns a new frozen descriptor;
 * nothing is mutated. A view type adds only its own methods (Text's
 * `.bold()`, Button's `.buttonStyle()`) through `extras`, and they stay
 * available after any common modifier: `Text('a').padding().bold()`.
 */

import {
  createDescriptor,
  addModifier,
  setKey,
  createModifier,
  ModifierType
} from './ViewDescriptor.js';
import { animationModifier, transitionModifier, matchedGeometryModifier } from '../Animation/Animation.js';
import { gestureModifier, longPressGestureModifier, dragGestureModifier } from '../Gesture/Gesture.js';

/**
 * @param {Object} descriptor - Base descriptor
 * @param {(tools: {
 *   descriptor: Object,
 *   wrap: (next: Object) => Object,
 *   add: (type: string, value: any) => Object,
 *   withProps: (changes: Object) => Object,
 * }) => Object} [extras] - Type-specific methods
 * @returns {Object} Frozen descriptor with modifier methods
 */
export function chainable(descriptor, extras = null) {
  const wrap = (next) => chainable(next, extras);
  const add = (type, value) => wrap(addModifier(descriptor, createModifier(type, value)));
  const withProps = (changes) => wrap(createDescriptor(
    descriptor.type,
    { ...descriptor.props, ...changes },
    descriptor.children,
    descriptor.key,
    descriptor.modifiers
  ));

  const chain = Object.create(null);
  Object.assign(chain, descriptor);

  // Environment (#49)
  chain.environment = (key, value) => add(ModifierType.ENVIRONMENT, { values: [[key, value]], objects: [] });
  chain.environmentObject = (object) => add(ModifierType.ENVIRONMENT, { values: [], objects: [object] });

  // Layout and style
  chain.padding = (value) => add(ModifierType.PADDING, value);
  chain.frame = (options) => add(ModifierType.FRAME, options);
  chain.foregroundColor = (color) => add(ModifierType.FOREGROUND_COLOR, color);
  chain.background = (color) => add(ModifierType.BACKGROUND, color);
  chain.font = (font) => add(ModifierType.FONT, font);
  chain.opacity = (value) => add(ModifierType.OPACITY, value);
  chain.cornerRadius = (radius) => add(ModifierType.CORNER_RADIUS, radius);
  chain.border = (color, width = 1) => add(ModifierType.BORDER, { color, width });
  chain.shadow = (options) => add(ModifierType.SHADOW, options);
  chain.clipShape = (shape) => add(ModifierType.CLIP_SHAPE, shape);
  chain.mask = (mask, alignment = 'center') => add(ModifierType.MASK, { shape: mask, alignment });
  chain.contentShape = (shape, eoFill = false) => add(ModifierType.CONTENT_SHAPE, { shape, eoFill });

  // Animation (src/Animation; the same implementation the legacy View uses)
  chain.animation = (animation, value) => add(ModifierType.ANIMATION, animationModifier(animation, value));
  chain.transition = (transition) => add(ModifierType.TRANSITION, transitionModifier(transition));
  chain.matchedGeometryEffect = (id, namespace, options = {}) =>
    add(ModifierType.MATCHED_GEOMETRY, matchedGeometryModifier(id, namespace, options));

  // Gestures (src/Gesture)
  chain.gesture = (gesture) => add(ModifierType.GESTURE, gestureModifier(gesture));
  chain.onLongPressGesture = (handler, options = {}) => add(ModifierType.GESTURE, longPressGestureModifier(handler, options));
  chain.onDrag = (onChanged, onEnded) => add(ModifierType.GESTURE, dragGestureModifier(onChanged, onEnded));

  // Effects
  chain.colorEffect = (shader, opts) => add(ModifierType.COLOR_EFFECT, { shader, ...(opts || {}) });
  chain.distortionEffect = (shader, opts) => add(ModifierType.DISTORTION_EFFECT, { shader, ...(opts || {}) });
  chain.layerEffect = (shader, opts) => add(ModifierType.LAYER_EFFECT, { shader, ...(opts || {}) });

  // Events and lifecycle
  chain.onTapGesture = (handler) => add(ModifierType.ON_TAP, handler);
  chain.onAppear = (handler) => add(ModifierType.ON_APPEAR, handler);
  chain.onDisappear = (handler) => add(ModifierType.ON_DISAPPEAR, handler);
  chain.onChange = (of, optionsOrAction, action) => add(ModifierType.ON_CHANGE, { of, optionsOrAction, action });
  chain.task = (optionsOrAction, action) => add(ModifierType.TASK, { optionsOrAction, action });

  // Search and presentation
  chain.searchable = (text, options = {}) => add(ModifierType.SEARCHABLE, { text, options });
  chain.sheet = (isPresented, optionsOrContent, content) => add(ModifierType.SHEET, { isPresented, optionsOrContent, content });
  chain.fullScreenCover = (isPresented, optionsOrContent, content) => add(ModifierType.PRESENTATION, { kind: 'fullScreenCover', isPresented, optionsOrContent, content });
  chain.alert = (title, isPresented, options) => add(ModifierType.PRESENTATION, { kind: 'alert', title, isPresented, options });
  chain.confirmationDialog = (title, isPresented, options) => add(ModifierType.PRESENTATION, { kind: 'confirmationDialog', title, isPresented, options });

  // Accessibility
  chain.accessibilityLabel = (label) => add(ModifierType.ACCESSIBILITY_LABEL, label);
  chain.accessibilityValue = (value) => add(ModifierType.ACCESSIBILITY_VALUE, value);
  chain.accessibilityHint = (hint) => add(ModifierType.ACCESSIBILITY_HINT, hint);
  chain.accessibilityIdentifier = (identifier) => add(ModifierType.ACCESSIBILITY_IDENTIFIER, identifier);

  // Identity
  chain.id = (key) => wrap(setKey(descriptor, key));
  // The last .tag(_:) wins (read by Picker, TabView and List).
  chain.tag = (value) => add(ModifierType.TAG, value);
  // TabView reads the builder from props._tabItem.
  chain.tabItem = (builder) => withProps({ _tabItem: builder });

  // The document title while this view is shown (#40); a State or Binding
  // keeps it in sync.
  chain.navigationTitle = (title) => add(ModifierType.NAVIGATION_TITLE, title);

  chain.modifier = (mod) => add(ModifierType.CUSTOM, mod);

  if (extras) Object.assign(chain, extras({ descriptor, wrap, add, withProps }));

  return Object.freeze(chain);
}

export default chainable;
