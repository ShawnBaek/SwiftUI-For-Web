/**
 * SwiftUI-For-Web server entry (#40): static rendering in Node.
 *
 *   import { renderToString, renderDocument, DocumentMetadata, sitemap } from 'swiftui-for-web/server';
 *
 * Import views from 'swiftui-for-web' (or './core') as usual; this entry
 * only adds the server-side functions.
 */
import * as SwiftUIServerNamespace from './server-exports.js';
import { namespaceObject } from './Core/namespaceObject.js';

export * from './server-exports.js';

const SwiftUIServer = /* @__PURE__ */ namespaceObject(SwiftUIServerNamespace);
export default SwiftUIServer;
