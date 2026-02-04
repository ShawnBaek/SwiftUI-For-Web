/**
 * SwiftUI-For-Web
 * A zero-dependency UI framework inspired by Apple's SwiftUI
 *
 * @module SwiftUI-For-Web
 * @version 1.0.0
 */

// =============================================================================
// Core
// =============================================================================
export { View } from './Core/View.js';
export {
  ViewBuilder,
  EmptyView, Empty,
  TupleView,
  ConditionalContent,
  AnyView, Any,
  buildView
} from './Core/ViewBuilder.js';

// =============================================================================
// Data (State Management)
// =============================================================================
export { State, createState } from './Data/State.js';
export { Binding, createBinding } from './Data/Binding.js';
export { ObservableObject, Published, createObservable } from './Data/ObservableObject.js';
export { StateObject, createStateObject, stateObject } from './Data/StateObject.js';
export {
  Observable,
  ObservationTracking,
  Bindable,
  withTracking,
  withObservationTracking
} from './Data/Observable.js';
export {
  Environment,
  EnvironmentObject,
  EnvironmentValues,
  ColorScheme,
  LayoutDirection,
  UserInterfaceSizeClass,
  extendViewWithEnvironment
} from './Data/Environment.js';

// =============================================================================
// View Components
// =============================================================================
export { Text, TextView } from './View/Text.js';
export { Image, ImageView, ContentMode } from './View/Image.js';
export { Label, LabelView, LabelStyle, SystemIcons } from './View/Label.js';

// Controls
export { Button, ButtonView } from './View/Control/Button.js';
export { TextField, TextFieldView, SecureField, SecureFieldView } from './View/Control/TextField.js';
export { Toggle, ToggleView } from './View/Control/Toggle.js';
export { Slider, SliderView } from './View/Control/Slider.js';
export { Stepper, StepperView } from './View/Control/Stepper.js';
export { Picker, PickerView, PickerStyle } from './View/Control/Picker.js';
export { Menu, MenuView } from './View/Control/Menu.js';
export { DatePicker, DatePickerView, DatePickerComponents, DatePickerStyle } from './View/Control/DatePicker.js';
export { ColorPicker, ColorPickerView } from './View/Control/ColorPicker.js';

// Lists
export { List, ListView, ListStyle } from './View/List/List.js';
export { ForEach, ForEachView, Range } from './View/List/ForEach.js';

// Containers
export { ScrollView, ScrollViewView, Axis } from './View/Container/ScrollView.js';
export { Group, GroupView } from './View/Container/Group.js';
export { Form, FormView, FormStyle, Section, SectionView } from './View/Container/Form.js';
export { DisclosureGroup, DisclosureGroupView } from './View/Container/DisclosureGroup.js';

// Navigation
export { NavigationStack, NavigationLink, BackButton } from './View/Navigation/NavigationStack.js';
export { TabView, TabViewView, TabViewStyle } from './View/Navigation/TabView.js';
export {
  NavigationPath,
  CodableRepresentation,
  NavigationDestination,
  extendNavigationStackWithPath
} from './View/Navigation/NavigationPath.js';

// =============================================================================
// Layout
// =============================================================================
export { VStack, VStackView } from './Layout/Stack/VStack.js';
export { HStack, HStackView } from './Layout/Stack/HStack.js';
export { ZStack, ZStackView } from './Layout/Stack/ZStack.js';
export { Spacer, SpacerView } from './Layout/Spacer.js';
export { Divider, DividerView } from './Layout/Divider.js';
export { GeometryReader, GeometryReaderView, GeometryProxy } from './Layout/GeometryReader.js';
export { Alignment, HorizontalAlignment, VerticalAlignment } from './Layout/Alignment.js';
export {
  Grid, GridView,
  GridRow, GridRowView,
  GridItem, GridItemSize,
  LazyVGrid, LazyVGridView,
  LazyHGrid, LazyHGridView
} from './Layout/Grid.js';
export {
  LazyVStack, LazyVStackView,
  LazyHStack, LazyHStackView,
  PinnedScrollableViews
} from './Layout/Stack/LazyStack.js';

// =============================================================================
// Shapes
// =============================================================================
export {
  ShapeView,
  Rectangle, RectangleView,
  RoundedRectangle, RoundedRectangleView,
  Circle, CircleView,
  Ellipse, EllipseView,
  Capsule, CapsuleView,
  Path, PathView,
  UnevenRoundedRectangle, UnevenRoundedRectangleView
} from './Shape/Shape.js';

// =============================================================================
// Graphics
// =============================================================================
export { Color, ColorValue } from './Graphic/Color.js';
export { Font, FontValue } from './Graphic/Font.js';
export { LinearGradient, RadialGradient, AngularGradient, GradientDirection, UnitPoint } from './Graphic/Gradient.js';

// =============================================================================
// Animation
// =============================================================================
export {
  Animation,
  AnyTransition,
  Namespace,
  withAnimation,
  isAnimating,
  currentAnimation,
  extendViewWithAnimation,
  isViewTransitionSupported,
  prefersReducedMotion
} from './Animation/Animation.js';

// =============================================================================
// Gestures
// =============================================================================
export {
  GestureBase,
  TapGesture, TapGestureRecognizer,
  LongPressGesture, LongPressGestureRecognizer,
  DragGesture, DragGestureRecognizer,
  MagnificationGesture, MagnificationGestureRecognizer,
  RotationGesture, RotationGestureRecognizer,
  extendViewWithGestures
} from './Gesture/Gesture.js';

// =============================================================================
// App
// =============================================================================
export { App, AppInstance } from './App/App.js';
export {
  WindowGroup, WindowGroupView,
  WindowResizability,
  WindowStyle,
  Scene,
  Settings, SettingsView,
  DocumentGroup, DocumentGroupView
} from './App/WindowGroup.js';

// =============================================================================
// Version Info
// =============================================================================
export const VERSION = '1.0.0';

// =============================================================================
// Extend View with Animation, Gesture, and Environment Methods
// =============================================================================
import { View } from './Core/View.js';
import { extendViewWithAnimation as _extendViewAnimation } from './Animation/Animation.js';
import { extendViewWithGestures as _extendViewGestures } from './Gesture/Gesture.js';
import { extendViewWithEnvironment as _extendViewEnvironment } from './Data/Environment.js';

_extendViewAnimation(View);
_extendViewGestures(View);
_extendViewEnvironment(View);

/**
 * Log framework initialization
 */
console.log(`SwiftUI-For-Web v${VERSION} - 100% SwiftUI Component Coverage`);
