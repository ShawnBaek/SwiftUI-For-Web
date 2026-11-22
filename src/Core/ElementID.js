/**
 * Element ids for ARIA relationships (aria-controls, aria-labelledby).
 *
 * Ids are `${prefix}-${n}`, counted per prefix. Static rendering (#40) runs
 * each render in its own scope that starts counting at 1, so the same view
 * always renders the same ids (deterministic output).
 */

let counters = new Map();

/**
 * @param {string} prefix - e.g. 'swiftui-toggle-label'
 * @returns {string}
 */
export function nextElementId(prefix) {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return `${prefix}-${next}`;
}

/**
 * Run `fn` with fresh id counters, then restore the previous ones.
 * @internal
 */
export function withElementIdScope(fn) {
  const previous = counters;
  counters = new Map();
  try {
    return fn();
  } finally {
    counters = previous;
  }
}
