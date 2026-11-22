/**
 * SwiftUI-For-Web: the full library.
 *
 *   import { VStack, Text } from 'swiftui-for-web';
 *   import SwiftUI from 'swiftui-for-web';
 *
 * The export list lives in ./exports.js. The default export is built from it,
 * so it never drifts from the named exports.
 */
import * as SwiftUINamespace from './exports.js';
import { namespaceObject } from './Core/namespaceObject.js';

export * from './exports.js';

// Marked pure so a bundler can drop it when only named exports are used.
const SwiftUI = /* @__PURE__ */ namespaceObject(SwiftUINamespace);
export default SwiftUI;
