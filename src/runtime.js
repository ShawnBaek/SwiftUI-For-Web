/**
 * Shared runtime initialization for public entry points and optimized apps.
 *
 * Application builds import this module when named imports from `src/index.js`
 * are routed directly to their defining modules. Keeping initialization here
 * preserves the legacy View's scoped .environment() without loading the full namespace.
 */

import { View } from './Core/View.js';
import { extendViewWithEnvironment } from './Data/Environment.js';

extendViewWithEnvironment(View);
