/**
 * Development-only checks (#52).
 *
 * DEV_BUILD is true in the source tree and false in the optimized build
 * (`scripts/build.js` rewrites it), so production pages pay nothing.
 */

export const DEV_BUILD = true;

let viewBuildDepth = 0;
const warnedSites = new Set();

/**
 * Run `fn` (a view factory) marked as "building a view", so an untracked
 * State.value read inside it can be reported.
 * @internal
 */
export function buildingView(fn) {
  if (!DEV_BUILD) return fn();
  viewBuildDepth++;
  try {
    return fn();
  } finally {
    viewBuildDepth--;
  }
}

/** @internal */
export function isBuildingView() {
  return viewBuildDepth > 0;
}

/**
 * Warn once per call site that a State's value was read while building a
 * view outside any reactive scope: the `Text(count.value)` mistake, which
 * renders once and never updates.
 * @internal
 */
export function warnUntrackedRead() {
  const stack = String(new Error().stack || '').split('\n');
  // [0] "Error", [1] this function, [2] State's getter, [3] the call site.
  const site = (stack[3] || stack[stack.length - 1] || '').trim();
  if (warnedSites.has(site)) return;
  warnedSites.add(site);
  console.warn(
    'SwiftUI-For-Web: a State value was read while building a view, outside any reactive scope, '
    + 'so the view will not update when it changes. Pass the State itself (Text(count), .opacity(isOn)) '
    + 'or a function for derived values (Text(() => `${count.value} items`)). '
    + `Read at: ${site || 'unknown'}`
  );
}
