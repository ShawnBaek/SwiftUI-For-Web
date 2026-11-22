/**
 * whenVisible - load an island's code when its host scrolls into view (#39).
 *
 * Has no imports, so a page can use it without loading the framework; the
 * framework loads only with the island's own module.
 *
 * @example
 *   import { whenVisible } from 'swiftui-for-web/islands';
 *   whenVisible('#finder', () => import('./finder-island.js'));
 *
 * @param {string|Element} host - The host element, or a selector for it
 * @param {(host: Element) => any} load - Called once, with the host
 * @param {{ rootMargin?: string }} [options] - Default rootMargin '200px'
 * @returns {() => void} Stops watching (load never runs if not run yet)
 */
export function whenVisible(host, load, options = {}) {
  const element = typeof host === 'string'
    ? (typeof document === 'undefined' ? null : document.querySelector(host))
    : host;
  if (!element || typeof load !== 'function') return () => {};

  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    load(element);
  };

  if (typeof IntersectionObserver !== 'function') {
    // No observer (old browser): load right away rather than never.
    run();
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      run();
    }
  }, { rootMargin: options.rootMargin ?? '200px' });
  observer.observe(element);
  return () => {
    done = true;
    observer.disconnect();
  };
}

export default whenVisible;
