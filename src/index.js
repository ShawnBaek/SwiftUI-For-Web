/**
 * SwiftUI-For-Web
 * A zero-dependency UI framework inspired by Apple's SwiftUI
 *
 * @module SwiftUI-For-Web
 * @version 1.0.0
 *
 * @example
 * // Simple import (recommended)
 * import SwiftUI from 'swiftui-for-web';
 * const { VStack, Text, Button, App } = SwiftUI;
 *
 * @example
 * // Named imports (also supported)
 * import { VStack, Text, Button, App } from 'swiftui-for-web';
 */

// =============================================================================
// Core
// =============================================================================
import { View } from './Core/View.js';
import {
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
import { State, createState } from './Data/State.js';
import { Binding, createBinding } from './Data/Binding.js';
import { ObservableObject, Published, createObservable } from './Data/ObservableObject.js';
import { StateObject, createStateObject, stateObject } from './Data/StateObject.js';
import {
  Observable,
  ObservationTracking,
  Bindable,
  withTracking,
  withObservationTracking
} from './Data/Observable.js';
import {
  Environment,
  EnvironmentObject,
  EnvironmentValues,
  ColorScheme,
  LayoutDirection,
  UserInterfaceSizeClass,
  UserInterfaceIdiom,
  currentDeviceIdiom,
  extendViewWithEnvironment
} from './Data/Environment.js';

// =============================================================================
// View Components
// =============================================================================
import { Text, TextView } from './View/Text.js';
import { Image, ImageView, ContentMode } from './View/Image.js';
import { Label, LabelView, LabelStyle, SystemIcons } from './View/Label.js';

// Controls
import { Button, ButtonView } from './View/Control/Button.js';
import { TextField, TextFieldView, SecureField, SecureFieldView } from './View/Control/TextField.js';
import { Toggle, ToggleView } from './View/Control/Toggle.js';
import { Slider, SliderView } from './View/Control/Slider.js';
import { Stepper, StepperView } from './View/Control/Stepper.js';
import { Picker, PickerView, PickerStyle } from './View/Control/Picker.js';
import { Menu, MenuView } from './View/Control/Menu.js';
import { DatePicker, DatePickerView, DatePickerComponents, DatePickerStyle } from './View/Control/DatePicker.js';
import { ColorPicker, ColorPickerView } from './View/Control/ColorPicker.js';

// Lists
import { List, ListView, ListStyle } from './View/List/List.js';
import { ForEach, ForEachView, Range } from './View/List/ForEach.js';

// Containers
import { ScrollView, ScrollViewView, Axis } from './View/Container/ScrollView.js';
import { Group, GroupView } from './View/Container/Group.js';
import { Form, FormView, FormStyle, Section, SectionView } from './View/Container/Form.js';
import { DisclosureGroup, DisclosureGroupView } from './View/Container/DisclosureGroup.js';

// Navigation
import { NavigationStack, NavigationLink, BackButton } from './View/Navigation/NavigationStack.js';
import { NavigationSplitView, NavigationSplitViewVisibility } from './View/Navigation/NavigationSplitView.js';
import { TabView, TabViewView, TabViewStyle } from './View/Navigation/TabView.js';
import {
  NavigationPath,
  CodableRepresentation,
  NavigationDestination,
  extendNavigationStackWithPath
} from './View/Navigation/NavigationPath.js';

// =============================================================================
// Layout
// =============================================================================
import { VStack, VStackView } from './Layout/Stack/VStack.js';
import { HStack, HStackView } from './Layout/Stack/HStack.js';
import { ZStack, ZStackView } from './Layout/Stack/ZStack.js';
import { Spacer, SpacerView } from './Layout/Spacer.js';
import { Divider, DividerView } from './Layout/Divider.js';
import { GeometryReader, GeometryReaderView, GeometryProxy } from './Layout/GeometryReader.js';
import { Alignment, HorizontalAlignment, VerticalAlignment } from './Layout/Alignment.js';
import {
  Grid, GridView,
  GridRow, GridRowView,
  GridItem, GridItemSize,
  LazyVGrid, LazyVGridView,
  LazyHGrid, LazyHGridView
} from './Layout/Grid.js';
import {
  LazyVStack, LazyVStackView,
  LazyHStack, LazyHStackView,
  PinnedScrollableViews
} from './Layout/Stack/LazyStack.js';
import { ViewThatFits, Axis as ViewThatFitsAxis } from './Layout/ViewThatFits.js';

// =============================================================================
// Shapes
// =============================================================================
import {
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
import { Color, ColorValue } from './Graphic/Color.js';
import { Font, FontValue } from './Graphic/Font.js';
import { LinearGradient, RadialGradient, AngularGradient, GradientDirection, UnitPoint } from './Graphic/Gradient.js';

// =============================================================================
// Animation
// =============================================================================
import {
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
import {
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
import { App, AppInstance } from './App/App.js';
import {
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
const VERSION = '1.0.0';

// =============================================================================
// Extend View with Animation, Gesture, and Environment Methods
// =============================================================================
extendViewWithAnimation(View);
extendViewWithGestures(View);
extendViewWithEnvironment(View);

// =============================================================================
// Default Export - Simple unified namespace
// =============================================================================
/**
 * SwiftUI-For-Web unified namespace
 * Import everything with: import SwiftUI from 'swiftui-for-web'
 */
const SwiftUI = {
  // Version
  VERSION,

  // Core
  View,
  ViewBuilder,
  EmptyView, Empty,
  TupleView,
  ConditionalContent,
  AnyView, Any,
  buildView,

  // State Management
  State, createState,
  Binding, createBinding,
  ObservableObject, Published, createObservable,
  StateObject, createStateObject, stateObject,
  Observable, ObservationTracking, Bindable,
  withTracking, withObservationTracking,
  Environment, EnvironmentObject, EnvironmentValues,
  ColorScheme, LayoutDirection,
  UserInterfaceSizeClass, UserInterfaceIdiom, currentDeviceIdiom,

  // Views
  Text, TextView,
  Image, ImageView, ContentMode,
  Label, LabelView, LabelStyle, SystemIcons,

  // Controls
  Button, ButtonView,
  TextField, TextFieldView,
  SecureField, SecureFieldView,
  Toggle, ToggleView,
  Slider, SliderView,
  Stepper, StepperView,
  Picker, PickerView, PickerStyle,
  Menu, MenuView,
  DatePicker, DatePickerView, DatePickerComponents, DatePickerStyle,
  ColorPicker, ColorPickerView,

  // Lists
  List, ListView, ListStyle,
  ForEach, ForEachView, Range,

  // Containers
  ScrollView, ScrollViewView, Axis,
  Group, GroupView,
  Form, FormView, FormStyle,
  Section, SectionView,
  DisclosureGroup, DisclosureGroupView,

  // Navigation
  NavigationStack, NavigationLink, BackButton,
  NavigationSplitView, NavigationSplitViewVisibility,
  NavigationPath, CodableRepresentation, NavigationDestination,
  TabView, TabViewView, TabViewStyle,

  // Layout
  VStack, VStackView,
  HStack, HStackView,
  ZStack, ZStackView,
  Spacer, SpacerView,
  Divider, DividerView,
  GeometryReader, GeometryReaderView, GeometryProxy,
  Alignment, HorizontalAlignment, VerticalAlignment,
  Grid, GridView,
  GridRow, GridRowView,
  GridItem, GridItemSize,
  LazyVGrid, LazyVGridView,
  LazyHGrid, LazyHGridView,
  LazyVStack, LazyVStackView,
  LazyHStack, LazyHStackView,
  PinnedScrollableViews,
  ViewThatFits, ViewThatFitsAxis,

  // Shapes
  ShapeView,
  Rectangle, RectangleView,
  RoundedRectangle, RoundedRectangleView,
  Circle, CircleView,
  Ellipse, EllipseView,
  Capsule, CapsuleView,
  Path, PathView,
  UnevenRoundedRectangle, UnevenRoundedRectangleView,

  // Graphics
  Color, ColorValue,
  Font, FontValue,
  LinearGradient, RadialGradient, AngularGradient,
  GradientDirection, UnitPoint,

  // Animation
  Animation, AnyTransition, Namespace,
  withAnimation, isAnimating, currentAnimation,
  isViewTransitionSupported, prefersReducedMotion,

  // Gestures
  GestureBase,
  TapGesture, TapGestureRecognizer,
  LongPressGesture, LongPressGestureRecognizer,
  DragGesture, DragGestureRecognizer,
  MagnificationGesture, MagnificationGestureRecognizer,
  RotationGesture, RotationGestureRecognizer,

  // App
  App, AppInstance,
  WindowGroup, WindowGroupView,
  WindowResizability, WindowStyle,
  Scene, Settings, SettingsView,
  DocumentGroup, DocumentGroupView
};

// Default export
export default SwiftUI;

// =============================================================================
// Named Exports (for backward compatibility and tree-shaking)
// =============================================================================
export {
  VERSION,

  // Core
  View,
  ViewBuilder,
  EmptyView, Empty,
  TupleView,
  ConditionalContent,
  AnyView, Any,
  buildView,

  // State Management
  State, createState,
  Binding, createBinding,
  ObservableObject, Published, createObservable,
  StateObject, createStateObject, stateObject,
  Observable, ObservationTracking, Bindable,
  withTracking, withObservationTracking,
  Environment, EnvironmentObject, EnvironmentValues,
  ColorScheme, LayoutDirection,
  UserInterfaceSizeClass, UserInterfaceIdiom, currentDeviceIdiom,
  extendViewWithEnvironment,

  // Views
  Text, TextView,
  Image, ImageView, ContentMode,
  Label, LabelView, LabelStyle, SystemIcons,

  // Controls
  Button, ButtonView,
  TextField, TextFieldView,
  SecureField, SecureFieldView,
  Toggle, ToggleView,
  Slider, SliderView,
  Stepper, StepperView,
  Picker, PickerView, PickerStyle,
  Menu, MenuView,
  DatePicker, DatePickerView, DatePickerComponents, DatePickerStyle,
  ColorPicker, ColorPickerView,

  // Lists
  List, ListView, ListStyle,
  ForEach, ForEachView, Range,

  // Containers
  ScrollView, ScrollViewView, Axis,
  Group, GroupView,
  Form, FormView, FormStyle,
  Section, SectionView,
  DisclosureGroup, DisclosureGroupView,

  // Navigation
  NavigationStack, NavigationLink, BackButton,
  NavigationSplitView, NavigationSplitViewVisibility,
  NavigationPath, CodableRepresentation, NavigationDestination,
  extendNavigationStackWithPath,
  TabView, TabViewView, TabViewStyle,

  // Layout
  VStack, VStackView,
  HStack, HStackView,
  ZStack, ZStackView,
  Spacer, SpacerView,
  Divider, DividerView,
  GeometryReader, GeometryReaderView, GeometryProxy,
  Alignment, HorizontalAlignment, VerticalAlignment,
  Grid, GridView,
  GridRow, GridRowView,
  GridItem, GridItemSize,
  LazyVGrid, LazyVGridView,
  LazyHGrid, LazyHGridView,
  LazyVStack, LazyVStackView,
  LazyHStack, LazyHStackView,
  PinnedScrollableViews,
  ViewThatFits, ViewThatFitsAxis,

  // Shapes
  ShapeView,
  Rectangle, RectangleView,
  RoundedRectangle, RoundedRectangleView,
  Circle, CircleView,
  Ellipse, EllipseView,
  Capsule, CapsuleView,
  Path, PathView,
  UnevenRoundedRectangle, UnevenRoundedRectangleView,

  // Graphics
  Color, ColorValue,
  Font, FontValue,
  LinearGradient, RadialGradient, AngularGradient,
  GradientDirection, UnitPoint,

  // Animation
  Animation, AnyTransition, Namespace,
  withAnimation, isAnimating, currentAnimation,
  extendViewWithAnimation,
  isViewTransitionSupported, prefersReducedMotion,

  // Gestures
  GestureBase,
  TapGesture, TapGestureRecognizer,
  LongPressGesture, LongPressGestureRecognizer,
  DragGesture, DragGestureRecognizer,
  MagnificationGesture, MagnificationGestureRecognizer,
  RotationGesture, RotationGestureRecognizer,
  extendViewWithGestures,

  // App
  App, AppInstance,
  WindowGroup, WindowGroupView,
  WindowResizability, WindowStyle,
  Scene, Settings, SettingsView,
  DocumentGroup, DocumentGroupView
};
