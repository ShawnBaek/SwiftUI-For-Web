/**
 * OwnedSlot — re-render a region of a view later without leaking effects.
 *
 * Legacy containers such as TabView and GeometryReader replace their content
 * after mount, from event handlers or observer callbacks, where there is no
 * current owner. Content rendered there would create effects that belong to
 * nothing and are never disposed (invariants I2/I3).
 *
 * A slot captures the owner that is current when it is created (call it
 * during `_render`). Each `render(build)` disposes the previous content's
 * effects and builds the new content in a fresh root under that owner. When
 * the owner is disposed (for example, the app unmounts), the slot disposes its
 * content and ignores later render requests.
 *
 * Internal helper; not part of the public API.
 */

import { createRoot, getOwner, onCleanup, runWithOwner } from '../Data/Signal.js';

/**
 * @returns {{ render: (build: () => Node|null) => Node|null, dispose: () => void, isDisposed: () => boolean }}
 */
export function createOwnedSlot() {
  const owner = getOwner();
  let disposeContent = null;
  let disposed = false;

  const disposeCurrent = () => {
    if (disposeContent) {
      const dispose = disposeContent;
      disposeContent = null;
      dispose();
    }
  };

  const dispose = () => {
    disposed = true;
    disposeCurrent();
  };

  if (owner) {
    runWithOwner(owner, () => onCleanup(dispose));
  }

  return {
    render(build) {
      if (disposed) return null;
      disposeCurrent();
      // Created outside any owner (e.g. View.rerender() or a container
      // rendered from a callback): nothing would ever dispose a root made
      // here, so build without one and let Renderer's unowned-render safety
      // net keep the content static instead of leaking effects.
      if (!owner) return build();
      // createRoot always makes an unparented root; disposal is wired through
      // the onCleanup registered on the captured owner above.
      return createRoot((d) => {
        disposeContent = d;
        return build();
      });
    },
    dispose,
    isDisposed: () => disposed,
  };
}
