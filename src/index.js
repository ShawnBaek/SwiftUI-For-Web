/**
 * SwiftUI-For-Web
 * A zero-dependency UI framework inspired by Apple's SwiftUI
 *
 * @module SwiftUI-For-Web
 * @version 0.1.0
 */

// =============================================================================
// Core
// =============================================================================
export { View } from './Core/View.js';
// export { ViewBuilder } from './Core/ViewBuilder.js';

// =============================================================================
// Data (State Management)
// =============================================================================
export { State, createState } from './Data/State.js';
export { Binding, createBinding } from './Data/Binding.js';
export { ObservableObject, Published, createObservable } from './Data/ObservableObject.js';

// =============================================================================
// View Components
// =============================================================================
export { Text, TextView } from './View/Text.js';
export { Image, ImageView, ContentMode } from './View/Image.js';

// Controls
export { Button, ButtonView } from './View/Control/Button.js';
export { TextField, TextFieldView, SecureField, SecureFieldView } from './View/Control/TextField.js';
export { Toggle, ToggleView } from './View/Control/Toggle.js';
// export { Slider } from './View/Control/Slider.js';

// Lists
// export { List } from './View/List/List.js';
export { ForEach, ForEachView, Range } from './View/List/ForEach.js';

// Containers
export { ScrollView, ScrollViewView, Axis } from './View/Container/ScrollView.js';

// Navigation
export { NavigationStack, NavigationLink, BackButton } from './View/Navigation/NavigationStack.js';

// =============================================================================
// Layout
// =============================================================================
export { VStack, VStackView } from './Layout/Stack/VStack.js';
export { HStack, HStackView } from './Layout/Stack/HStack.js';
export { ZStack, ZStackView } from './Layout/Stack/ZStack.js';
export { Spacer, SpacerView } from './Layout/Spacer.js';
// export { Divider } from './Layout/Divider.js';
export { Alignment, HorizontalAlignment, VerticalAlignment } from './Layout/Alignment.js';

// =============================================================================
// Graphics
// =============================================================================
export { Color, ColorValue } from './Graphic/Color.js';
export { Font, FontValue } from './Graphic/Font.js';
export { LinearGradient, RadialGradient, AngularGradient, GradientDirection, UnitPoint } from './Graphic/Gradient.js';

// =============================================================================
// Animation
// =============================================================================
export { Animation, withAnimation, withAnimationTypes, isViewTransitionSupported, prefersReducedMotion } from './Animation/Animation.js';

// =============================================================================
// App
// =============================================================================
export { App, AppInstance } from './App/App.js';

// =============================================================================
// Version Info
// =============================================================================
export const VERSION = '0.1.0';

/**
 * Log framework initialization
 */
console.log(`SwiftUI-For-Web v${VERSION} initialized`);
