/**
 * Core module exports
 * Contains base classes for the SwiftUI-For-Web framework
 */

export { View, default as ViewDefault } from './View.js';
export { Reconciler } from './Reconciler.js';
export { ChangeTracker, createTrackedProperty } from './ChangeTracker.js';

// New descriptor-based system
export {
  createDescriptor,
  isDescriptor,
  isLegacyView,
  addModifier,
  setKey,
  descriptorsEqual,
  memo,
  isMemoized,
  createModifier,
  ModifierType,
  VIEW_DESCRIPTOR,
  MEMOIZED
} from './ViewDescriptor.js';

export {
  render,
  renderChildren,
  applyModifiers,
  registerRenderer
} from './Renderer.js';

// Descriptor-based view factories (new API)
export {
  Text as TextD,
  VStack as VStackD,
  HStack as HStackD,
  ZStack as ZStackD,
  Spacer as SpacerD,
  Divider as DividerD,
  Button as ButtonD,
  Image as ImageD,
  Group as GroupD,
  ScrollView as ScrollViewD,
  ForEach as ForEachD,
  Memo
} from './ViewFactory.js';
