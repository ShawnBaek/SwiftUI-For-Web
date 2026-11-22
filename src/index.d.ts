/**
 * Type declarations for 'swiftui-for-web': everything in
 * 'swiftui-for-web/core' (src/core.d.ts) plus 'swiftui-for-web/charts'.
 */
export * from './core.js';
export * from './Charts/index.js';

import * as SwiftUIFull from './index.js';

/**
 * The default export: every declared named export, Charts included, as one
 * namespace object.
 */
declare const SwiftUI: Omit<typeof SwiftUIFull, 'default'>;
export default SwiftUI;
