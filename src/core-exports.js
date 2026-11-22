/**
 * SwiftUI-For-Web Core Module (without Charts)
 * A zero-dependency UI framework inspired by Apple's SwiftUI
 *
 * @module SwiftUI-For-Web/core
 * @version 3.0.0-alpha.2
 *
 * @example
 * // Import core only (smaller bundle, no Charts)
 * import SwiftUI from 'swiftui-for-web/core';
 * const { VStack, Text, Button, App } = SwiftUI;
 *
 * @example
 * // Import Charts separately if needed
 * import { Chart, BarMark, value } from 'swiftui-for-web/charts';
 */

import './runtime.js';

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
import { Text, AccessibilityHeadingLevel } from './View/Text.js';
import { Image, ImageView, ContentMode } from './View/Image.js';
import { Label, LabelView, LabelStyle, SystemIcons } from './View/Label.js';
import { SearchFieldPlacement } from './View/Search.js';

// Controls
import { Button } from './View/Control/Button.js';
import { TextField, SecureField } from './View/Control/TextField.js';
import { Toggle } from './View/Control/Toggle.js';
import { Slider } from './View/Control/Slider.js';
import { Stepper } from './View/Control/Stepper.js';
import { Picker, PickerStyle } from './View/Control/Picker.js';
import { Menu, MenuView } from './View/Control/Menu.js';
import { DatePicker, DatePickerComponents, DatePickerStyle } from './View/Control/DatePicker.js';
import { ColorPicker } from './View/Control/ColorPicker.js';

// Lists
import { List, ListView, ListStyle } from './View/List/List.js';
import { ForEach, Range } from './View/List/ForEach.js';

// Reactive control flow (signal engine)
import { Show } from './View/ControlFlow/Show.js';
import { For } from './View/ControlFlow/For.js';

// Public reactive helpers — for modifier-body reactivity that the
// framework can't infer (e.g. setting el.style from a tracked read).
// Returns a disposer; cleanup happens automatically via the active owner.
import { createEffect as effect, untrack } from './Data/Signal.js';

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
import { VStack } from './Layout/Stack/VStack.js';
import { HStack } from './Layout/Stack/HStack.js';
import { ZStack } from './Layout/Stack/ZStack.js';
import { Spacer } from './Layout/Spacer.js';
import { Divider } from './Layout/Divider.js';
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
import { Shader, ShaderLibrary, ShaderKind } from './Graphic/Shader.js';

// =============================================================================
// Animation
// =============================================================================
import {
  Animation,
  AnyTransition,
  Namespace,
  animate,
  animateStyles,
  withAnimation,
  isAnimating,
  currentAnimation,
  extendViewWithAnimation,
  isViewTransitionSupported,
  prefersReducedMotion
} from './Animation/Animation.js';

// =============================================================================
// Performance Infrastructure
// =============================================================================
import { batch, flushSync } from './Core/Scheduler.js';
import {
  onAppear as lifecycleOnAppear,
  onDisappear as lifecycleOnDisappear,
  getLifecycleStats
} from './Core/LifecycleObserver.js';

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
const VERSION = '3.0.0-alpha.2';



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
  Text,
  AccessibilityHeadingLevel,
  Image, ImageView, ContentMode,
  Label, LabelView, LabelStyle, SystemIcons,
  SearchFieldPlacement,

  // Controls
  Button,
  TextField,
  SecureField,
  Toggle,
  Slider,
  Stepper,
  Picker, PickerStyle,
  Menu, MenuView,
  DatePicker, DatePickerComponents, DatePickerStyle,
  ColorPicker,

  // Lists
  List, ListView, ListStyle,
  ForEach, Range,

  // Reactive control flow (signal engine)
  Show,
  For,
  effect,
  untrack,

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
  VStack,
  HStack,
  ZStack,
  Spacer,
  Divider,
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
  Shader, ShaderLibrary, ShaderKind,

  // Animation
  Animation, AnyTransition, Namespace,
  animate, animateStyles,
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
  DocumentGroup, DocumentGroupView,

  // Batching (the scheduler, element pool, event delegation and GPU-layer
  // helpers moved to 'swiftui-for-web/performance' in 3.0)
  batch, flushSync
};
