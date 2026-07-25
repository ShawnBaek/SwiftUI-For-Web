/**
 * Shared runtime initialization for public entry points and optimized apps.
 *
 * Application builds import this module when named imports from `src/index.js`
 * are routed directly to their defining modules. Keeping initialization here
 * preserves legacy View prototype modifiers without loading the full namespace.
 */

import { View } from './Core/View.js';
import { extendViewWithAnimation } from './Animation/Animation.js';
import { extendViewWithGestures } from './Gesture/Gesture.js';
import { extendViewWithEnvironment } from './Data/Environment.js';

extendViewWithAnimation(View);
extendViewWithGestures(View);
extendViewWithEnvironment(View);
