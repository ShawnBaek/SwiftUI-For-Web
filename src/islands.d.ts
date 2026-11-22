/**
 * SwiftUI-For-Web islands entry (#39).
 */

/**
 * Call `load(host)` once, when `host` comes within `rootMargin` of the
 * viewport (default '200px'). Without IntersectionObserver it loads at once.
 * Returns a function that stops watching.
 */
export function whenVisible(
  host: string | Element,
  load: (host: Element) => unknown,
  options?: { rootMargin?: string }
): () => void;

declare const SwiftUIIslands: { whenVisible: typeof whenVisible };
export default SwiftUIIslands;
