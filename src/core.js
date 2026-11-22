/**
 * SwiftUI-For-Web core: everything in the full library except Charts.
 *
 *   import { VStack, Text } from 'swiftui-for-web/core';
 *   import { Chart, BarMark } from 'swiftui-for-web/charts';
 *
 * The export list lives in ./core-exports.js. The default export is built
 * from it, so it never drifts from the named exports.
 */
import * as SwiftUICoreNamespace from './core-exports.js';
import { namespaceObject } from './Core/namespaceObject.js';

export * from './core-exports.js';

// Marked pure so a bundler can drop it when only named exports are used.
const SwiftUICore = /* @__PURE__ */ namespaceObject(SwiftUICoreNamespace);
export default SwiftUICore;
