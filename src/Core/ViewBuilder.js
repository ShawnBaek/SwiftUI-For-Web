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

import { View } from './View.js';

/**
 * ViewBuilder - Constructs view hierarchies from builder functions
 */
export class ViewBuilder {
  /**
   * Build a view from a builder function
   * @param {Function} builder - Function that returns views
   * @returns {View|View[]} The built view(s)
   */
  static buildBlock(...components) {
    // Flatten and filter out null/undefined
    const views = components
      .flat(Infinity)
      .filter(v => v != null && v !== false);

    if (views.length === 0) {
      return new EmptyView();
    }

    if (views.length === 1) {
      return views[0];
    }

    // Return a Group containing all views
    return new TupleView(views);
  }

  /**
   * Build optional content
   * @param {*} condition - Condition to evaluate
   * @param {Function} builder - Builder function if condition is truthy
   * @returns {View|EmptyView}
   */
  static buildIf(condition, builder) {
    if (condition) {
      return builder();
    }
    return new EmptyView();
  }

  /**
   * Build either/or content
   * @param {*} condition - Condition to evaluate
   * @param {Function} trueBuilder - Builder if condition is truthy
   * @param {Function} falseBuilder - Builder if condition is falsy
   * @returns {View}
   */
  static buildEither(condition, trueBuilder, falseBuilder) {
    return condition ? trueBuilder() : falseBuilder();
  }

  /**
   * Build from an array
   * @param {Array} array - Array of items
   * @param {Function} builder - Builder function for each item
   * @returns {View[]}
   */
  static buildArray(array, builder) {
    return array.map((item, index) => builder(item, index));
  }

  /**
   * Build with availability check (for web, always available)
   * @param {Function} builder - Builder function
   * @returns {View}
   */
  static buildLimitedAvailability(builder) {
    return builder();
  }
}

/**
 * EmptyView - A view that displays nothing
 *
 * @example
 * EmptyView()
 */
export class EmptyView extends View {
  constructor() {
    super();
  }

  _render() {
    // Return an empty comment node as placeholder
    const comment = document.createComment('EmptyView');
    return comment;
  }
}

/**
 * Factory function for EmptyView
 */
export function Empty() {
  return new EmptyView();
}

/**
 * TupleView - A view that contains multiple child views
 * Used internally by ViewBuilder to group multiple views
 */
export class TupleView extends View {
  constructor(views) {
    super();
    this._views = views;
  }

  _render() {
    const fragment = document.createDocumentFragment();

    for (const view of this._views) {
      if (view instanceof View) {
        fragment.appendChild(view._render());
      } else if (view instanceof Node) {
        fragment.appendChild(view);
      }
    }

    // Wrap in a container div
    const container = document.createElement('div');
    container.dataset.view = 'tuple';
    container.style.display = 'contents'; // Don't affect layout
    container.appendChild(fragment);

    return this._applyModifiers(container);
  }
}

/**
 * ConditionalContent - A view that shows content based on a condition
 *
 * @example
 * ConditionalContent(isLoggedIn,
 *   () => Text('Welcome!'),
 *   () => Button('Log In', login)
 * )
 */
export class ConditionalContent extends View {
  constructor(condition, trueContent, falseContent = null) {
    super();
    this._condition = condition;
    this._trueContent = trueContent;
    this._falseContent = falseContent;
  }

  _render() {
    const condition = typeof this._condition === 'function'
      ? this._condition()
      : this._condition;

    if (condition) {
      const content = typeof this._trueContent === 'function'
        ? this._trueContent()
        : this._trueContent;
      return content instanceof View ? content._render() : document.createComment('empty');
    } else if (this._falseContent) {
      const content = typeof this._falseContent === 'function'
        ? this._falseContent()
        : this._falseContent;
      return content instanceof View ? content._render() : document.createComment('empty');
    }

    return document.createComment('ConditionalContent: false');
  }
}

/**
 * AnyView - A type-erased view
 *
 * @example
 * AnyView(someView)
 */
export class AnyView extends View {
  constructor(view) {
    super();
    this._wrappedView = view;
  }

  _render() {
    if (this._wrappedView instanceof View) {
      return this._wrappedView._render();
    }
    return document.createComment('AnyView: empty');
  }
}

/**
 * Factory function for AnyView
 */
export function Any(view) {
  return new AnyView(view);
}

/**
 * ViewBuilder function - creates views from a builder function
 * @param {Function} builder - Builder function
 * @returns {View}
 */
export function buildView(builder) {
  const result = builder();

  if (result instanceof View) {
    return result;
  }

  if (Array.isArray(result)) {
    return ViewBuilder.buildBlock(...result);
  }

  return new EmptyView();
}

export default ViewBuilder;
