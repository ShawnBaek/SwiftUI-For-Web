/**
 * SwiftUI-For-Web performance internals (#47), moved out of the main entry
 * in 3.0. Unstable: these follow the renderer's needs.
 */

/** Scheduler lanes, highest priority first. */
export const SyncLane: number;
export const DiscreteLane: number;
export const DefaultLane: number;
export const TransitionLane: number;
export const IdleLane: number;
/** Queue `work` in a scheduler lane. */
export function scheduleWork(work: () => void, lane?: number): void;
/** Run `fn` after the current flush. */
export function schedulePostFlush(fn: () => void): void;
/** Queue a DOM write for the next flush. */
export function enqueueDOMWrite(write: () => void): void;
/** Start coalescing updates into one flush; pair with endBatch(). */
export function batchUpdates(): void;
/** End a batch started with batchUpdates() and flush. */
export function endBatch(): void;
export function getSchedulerStats(): Record<string, number>;
export function resetSchedulerStats(): void;
/** Element pool used by the renderer. */
export function acquireElement(tagName: string): HTMLElement;
export function releaseElement(element: HTMLElement): void;
export function releaseTree(root: Node): void;
export function clearPools(): void;
export function getPoolStats(): Record<string, number>;
/** Event delegation used by the renderer. */
export function initDelegation(root: HTMLElement, eventTypes?: string[]): void;
export function teardownDelegation(root: HTMLElement): void;
export function delegateEvent(element: HTMLElement, eventType: string, handler: (event: Event) => void, root?: HTMLElement): void;
export function undelegateEvent(element: HTMLElement, eventType: string): void;
/** Move an element to its own compositor layer during an animation, and back. */
export function promoteToGPULayer(element: HTMLElement): void;
export function demoteFromGPULayer(element: HTMLElement): void;
/** Group several state writes into one update */
export function batch<T>(fn: () => T): T;
/** Apply pending state updates now, instead of waiting for the next microtask */
export function flushSync(): void;

declare const SwiftUIPerformance: Record<string, unknown>;
export default SwiftUIPerformance;
