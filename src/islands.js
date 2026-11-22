/**
 * SwiftUI-For-Web islands entry (#39): progressive activation helpers that
 * load no framework code themselves.
 *
 *   import { whenVisible } from 'swiftui-for-web/islands';
 */
import * as SwiftUIIslandsNamespace from './islands-exports.js';

export * from './islands-exports.js';

const SwiftUIIslands = Object.freeze({ ...SwiftUIIslandsNamespace });
export default SwiftUIIslands;
