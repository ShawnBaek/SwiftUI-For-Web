/**
 * ViewBuilder - A result builder for constructing views
 *
 * Matches SwiftUI's @ViewBuilder for creating view hierarchies.
 * In JavaScript, we simulate this with functions that return arrays of views.
 *
 * @example
 * const MyView = ViewBuilder(() => {
 *   if (showHeader) {
 *     return Text('Header');
 *   }
 *   return [
 *     Text('Line 1'),
 *     Text('Line 2')
 *   ];
 * });
 *
 * @example
 * // Conditional content
 * ViewBuilder.buildIf(condition, () => Text('Shown when true'));
 *
 * // Either/or content
 * ViewBuilder.buildEither(
 *   condition,
 *   () => Text('True case'),
 *   () => Text('False case')
 * );
 */

import { createDescriptor, isView } from './ViewDescriptor.js';
import { chainable } from './Chainable.js';
import { registerRenderer, render } from './Renderer.js';
import { Group } from '../View/Container/Group.js';

/**
 * ViewBuilder - Constructs view hierarchies from builder functions
 */
export class ViewBuilder {
  /** Several views as one: none is EmptyView, one is itself, more a Group. */
  static buildBlock(...components) {
    const views = components.flat(Infinity).filter((v) => v != null && v !== false);
    if (views.length === 0) return EmptyView();
    return views.length === 1 ? views[0] : Group(views);
  }

  static buildIf(condition, builder) {
    return condition ? builder() : EmptyView();
  }

  static buildEither(condition, trueBuilder, falseBuilder) {
    return condition ? trueBuilder() : falseBuilder();
  }

  static buildArray(array, builder) {
    return array.map((item, index) => builder(item, index));
  }

  static buildLimitedAvailability(builder) {
    return builder();
  }
}

/** A view that renders nothing (an empty comment node). */
export function EmptyView() {
  return chainable(createDescriptor('EmptyView'));
}

registerRenderer('EmptyView', () => document.createComment('EmptyView'));

/**
 * One of two views, chosen when it renders. The condition and each content
 * may be a value or a function returning one.
 */
export function ConditionalContent(condition, trueContent, falseContent = null) {
  return AnyView(() => {
    const value = (v) => (typeof v === 'function' && !isView(v) ? v() : v);
    return value(value(condition) ? trueContent : falseContent);
  });
}

/** Type erasure: wraps a view, or a function returning one, as one view. */
export function AnyView(view) {
  return chainable(createDescriptor('AnyView', { view }));
}

registerRenderer('AnyView', ({ view }) => {
  const content = typeof view === 'function' && !isView(view) ? view() : view;
  return isView(content) ? render(content) : document.createComment('AnyView: empty');
});

/** Same as EmptyView(). */
export const Empty = EmptyView;

/** Same as AnyView(view). */
export const Any = AnyView;

/** The view a builder function returns; an array becomes a block. */
export function buildView(builder) {
  const result = builder();
  if (isView(result)) return result;
  if (Array.isArray(result)) return ViewBuilder.buildBlock(...result);
  return EmptyView();
}

export default ViewBuilder;
