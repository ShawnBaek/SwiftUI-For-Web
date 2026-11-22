/**
 * SwiftUI-For-Web performance internals (#47): the scheduler, element pool,
 * event delegation and GPU-layer helpers the renderer uses. They left the
 * main entry in 3.0; import them from here when you need them.
 *
 *   import { scheduleWork, SyncLane } from 'swiftui-for-web/performance';
 */
import * as SwiftUIPerformanceNamespace from './performance-exports.js';

export * from './performance-exports.js';

const SwiftUIPerformance = Object.freeze({ ...SwiftUIPerformanceNamespace });
export default SwiftUIPerformance;
