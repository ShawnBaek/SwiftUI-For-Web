/**
 * SwiftUI-For-Web TypeScript Declarations
 * Provides IDE auto-completion and IntelliSense support
 *
 * @module swiftui-for-web
 * @version 1.1.0
 */

// =============================================================================
// Core Types
// =============================================================================

/** Base View class - all UI components extend this */
export class View {
  /** Apply a custom modifier */
  modifier(mod: ViewModifier): this;

  // Layout Modifiers
  /** Add padding around the view */
  padding(value?: number | EdgeInsets): this;
  /** Set explicit width and/or height */
  frame(options: FrameOptions): this;
  /** Offset the view's position */
  offset(x?: number, y?: number): this;
  /** Position the view absolutely */
  position(x: number, y: number): this;

  // Style Modifiers
  /** Set the foreground (text/icon) color */
  foregroundColor(color: Color | string): this;
  /** Set the background color or view */
  background(color: Color | string | View): this;
  /** Set the font style */
  font(font: Font): this;
  /** Set opacity (0.0 - 1.0) */
  opacity(value: number): this;
  /** Round the corners */
  cornerRadius(radius: number): this;
  /** Add a border */
  border(color: Color | string, width?: number): this;
  /** Add a shadow */
  shadow(options?: ShadowOptions): this;
  /** Clip to a shape */
  clipShape(shape: Shape): this;

  // Event Modifiers
  /** Handle tap/click events */
  onTapGesture(action: () => void): this;
  /** Called when view appears */
  onAppear(action: () => void): this;
  /** Called when view disappears */
  onDisappear(action: () => void): this;

  // Gesture Modifiers
  /** Add a gesture recognizer */
  gesture(gesture: Gesture): this;
  /** Handle drag gestures */
  onDrag(handler: (value: DragGestureValue) => void): this;
  /** Handle long press */
  onLongPressGesture(minimumDuration?: number, action?: () => void): this;

  // Animation Modifiers
  /** Animate changes with a transition */
  transition(transition: AnyTransition): this;
  /** Apply animation to changes */
  animation(animation: Animation, value?: any): this;
  /** Match geometry for hero animations */
  matchedGeometryEffect(id: string, namespace: Namespace): this;

  // Environment
  /** Inject environment value */
  environment(keyPath: string, value: any): this;
  /** Inject environment object */
  environmentObject(object: ObservableObject): this;

  /** Render to DOM element */
  _render(): HTMLElement;
}

export interface ViewModifier {
  apply(element: HTMLElement): void;
}

export interface FrameOptions {
  width?: number | string;
  height?: number | string;
  minWidth?: number;
  maxWidth?: number | 'infinity';
  minHeight?: number;
  maxHeight?: number | 'infinity';
  alignment?: Alignment;
}

export interface EdgeInsets {
  top?: number;
  leading?: number;
  bottom?: number;
  trailing?: number;
  horizontal?: number;
  vertical?: number;
}

export interface ShadowOptions {
  color?: Color | string;
  radius?: number;
  x?: number;
  y?: number;
}

// =============================================================================
// State Management
// =============================================================================

/** Reactive state container - triggers UI updates on change */
export class State<T> {
  constructor(initialValue: T);

  /** Current value - setting triggers re-render */
  value: T;

  /** @deprecated Use .value instead */
  wrappedValue: T;

  /** Get a Binding for two-way data flow */
  get binding(): Binding<T>;

  /** Subscribe to value changes */
  subscribe(callback: (newValue: T) => void): () => void;
}

/** Creates a new State instance */
export function createState<T>(initialValue: T): State<T>;

/** Two-way binding to a value */
export class Binding<T> {
  constructor(get: () => T, set: (value: T) => void);

  /** Current value */
  wrappedValue: T;

  /** Create a binding to a property of this binding's value */
  project<K extends keyof T>(key: K): Binding<T[K]>;
}

/** Creates a new Binding instance */
export function createBinding<T>(get: () => T, set: (value: T) => void): Binding<T>;

/** Base class for observable view models */
export class ObservableObject {
  /** Subscribe to any published property changes */
  subscribe(callback: () => void): () => void;

  /** Notify all subscribers of changes */
  objectWillChange(): void;
}

/** Mark a property as published (triggers updates on change) */
export function Published<T>(target: any, propertyKey: string): void;

/** Creates an observable object with automatic change tracking */
export function createObservable<T extends object>(target: T): T & ObservableObject;

/** iOS 17+ style Observable macro equivalent */
export class Observable {
  static create<T extends object>(target: T): T;
}

/** StateObject - owned observable that persists across re-renders */
export class StateObject<T extends ObservableObject> {
  constructor(wrappedValue: () => T);
  wrappedValue: T;
  projectedValue: T;
}

// =============================================================================
// Environment
// =============================================================================

/** Environment value keys */
export const EnvironmentValues: {
  colorScheme: string;
  layoutDirection: string;
  horizontalSizeClass: string;
  verticalSizeClass: string;
  locale: string;
  calendar: string;
  timeZone: string;
  dismiss: string;
  openURL: string;
  isEnabled: string;
  font: string;
  lineLimit: string;
  minimumScaleFactor: string;
  truncationMode: string;
};

/** Color scheme enum */
export const ColorScheme: {
  light: string;
  dark: string;
};

/** Layout direction enum */
export const LayoutDirection: {
  leftToRight: string;
  rightToLeft: string;
};

/** Size class enum */
export const UserInterfaceSizeClass: {
  compact: string;
  regular: string;
};

/** Device idiom enum */
export const UserInterfaceIdiom: {
  phone: string;
  pad: string;
  mac: string;
  tv: string;
  carPlay: string;
  vision: string;
};

/** Environment container for injecting values */
export class Environment {
  static set(key: string, value: any): void;
  static get(key: string): any;
  static subscribe(key: string, callback: (value: any) => void): () => void;
}

/** Environment object for sharing observable objects */
export class EnvironmentObject<T extends ObservableObject> {
  constructor(type: new () => T);
  wrappedValue: T;
}

// =============================================================================
// View Components
// =============================================================================

/** Display text content */
export function Text(content: string | number): View & {
  /** Set font style */
  font(font: Font): View;
  /** Set font weight */
  fontWeight(weight: FontWeight): View;
  /** Make text bold */
  bold(): View;
  /** Make text italic */
  italic(): View;
  /** Underline the text */
  underline(active?: boolean, color?: Color): View;
  /** Strikethrough the text */
  strikethrough(active?: boolean, color?: Color): View;
  /** Set line limit */
  lineLimit(limit: number | null): View;
  /** Set text alignment */
  multilineTextAlignment(alignment: TextAlignment): View;
  /** Set truncation mode */
  truncationMode(mode: TruncationMode): View;
  /** Set minimum scale factor */
  minimumScaleFactor(factor: number): View;
  /** Use monospaced digits */
  monospacedDigit(): View;
};

/** Display an image */
export function Image(source: string | { systemName: string }): View & {
  /** Set image to be resizable */
  resizable(): View;
  /** Set aspect ratio */
  aspectRatio(ratio?: number, contentMode?: ContentMode): View;
  /** Scale to fit */
  scaledToFit(): View;
  /** Scale to fill */
  scaledToFill(): View;
  /** Set rendering mode */
  renderingMode(mode: 'original' | 'template'): View;
  /** Set interpolation quality */
  interpolation(quality: 'none' | 'low' | 'medium' | 'high'): View;
};

/** Content mode for images */
export const ContentMode: {
  fit: string;
  fill: string;
};

/** Label with icon and text */
export function Label(title: string, options: { systemImage?: string; image?: string }): View;

// =============================================================================
// Controls
// =============================================================================

/** Interactive button */
export function Button(label: string | View, action: () => void): View & {
  /** Set button style */
  buttonStyle(style: ButtonStyle): View;
  /** Disable the button */
  disabled(isDisabled: boolean): View;
};

/** Button style presets */
export const ButtonStyle: {
  automatic: string;
  bordered: string;
  borderedProminent: string;
  borderless: string;
  plain: string;
};

/** Text input field */
export function TextField(placeholder: string, text: Binding<string>): View & {
  /** Set text field style */
  textFieldStyle(style: TextFieldStyle): View;
  /** Disable autocorrect */
  disableAutocorrection(disable: boolean): View;
  /** Set keyboard type */
  keyboardType(type: string): View;
  /** Handle submit */
  onSubmit(action: () => void): View;
};

/** Secure password input */
export function SecureField(placeholder: string, text: Binding<string>): View;

/** Boolean toggle switch */
export function Toggle(label: string | View, isOn: Binding<boolean>): View & {
  /** Set toggle style */
  toggleStyle(style: ToggleStyle): View;
  /** Set tint color */
  tint(color: Color): View;
};

/** Toggle style presets */
export const ToggleStyle: {
  automatic: string;
  switch: string;
  button: string;
  checkbox: string;
};

/** Slider for selecting a value from a range */
export function Slider(
  value: Binding<number>,
  options?: { in?: [number, number]; step?: number }
): View & {
  /** Set tint color */
  tint(color: Color): View;
};

/** Stepper for incrementing/decrementing values */
export function Stepper(
  label: string | View,
  value: Binding<number>,
  options?: { in?: [number, number]; step?: number }
): View;

/** Picker for selecting from options */
export function Picker<T>(
  label: string,
  selection: Binding<T>,
  content: () => View
): View & {
  /** Set picker style */
  pickerStyle(style: PickerStyle): View;
};

/** Picker style presets */
export const PickerStyle: {
  automatic: string;
  menu: string;
  segmented: string;
  wheel: string;
  inline: string;
};

/** Date picker */
export function DatePicker(
  label: string,
  selection: Binding<Date>,
  options?: { displayedComponents?: DatePickerComponents }
): View;

/** Date picker components */
export const DatePickerComponents: {
  date: string;
  hourAndMinute: string;
};

/** Color picker */
export function ColorPicker(label: string, selection: Binding<Color>): View;

/** Dropdown menu */
export function Menu(label: string | View, content: () => View): View;

// =============================================================================
// Layout
// =============================================================================

interface StackOptions {
  alignment?: Alignment | HorizontalAlignment | VerticalAlignment;
  spacing?: number;
}

/** Vertical stack - arranges children top to bottom */
export function VStack(options: StackOptions, ...children: View[]): View;
export function VStack(...children: View[]): View;

/** Horizontal stack - arranges children leading to trailing */
export function HStack(options: StackOptions, ...children: View[]): View;
export function HStack(...children: View[]): View;

/** Z-axis stack - layers children on top of each other */
export function ZStack(options: { alignment?: Alignment }, ...children: View[]): View;
export function ZStack(...children: View[]): View;

/** Lazy vertical stack - only renders visible items */
export function LazyVStack(options: StackOptions, ...children: View[]): View;

/** Lazy horizontal stack - only renders visible items */
export function LazyHStack(options: StackOptions, ...children: View[]): View;

/** Flexible space that expands to fill available space */
export function Spacer(options?: { minLength?: number }): View;

/** Visual separator line */
export function Divider(): View;

/** CSS Grid layout */
export function Grid(options: { alignment?: Alignment; horizontalSpacing?: number; verticalSpacing?: number }, ...children: View[]): View;

/** Grid row container */
export function GridRow(options: { alignment?: VerticalAlignment }, ...children: View[]): View;

/** Grid item configuration */
export function GridItem(options?: { size?: GridItemSize; spacing?: number; alignment?: Alignment }): any;

/** Grid item size */
export const GridItemSize: {
  fixed(value: number): any;
  flexible(minimum?: number, maximum?: number): any;
  adaptive(minimum: number, maximum?: number): any;
};

/** Lazy vertical grid */
export function LazyVGrid(columns: any[], options?: { spacing?: number; pinnedViews?: any }, ...children: View[]): View;

/** Lazy horizontal grid */
export function LazyHGrid(rows: any[], options?: { spacing?: number; pinnedViews?: any }, ...children: View[]): View;

/** Access parent geometry */
export function GeometryReader(content: (geometry: GeometryProxy) => View): View;

/** Geometry information */
export interface GeometryProxy {
  size: { width: number; height: number };
  safeAreaInsets: EdgeInsets;
  frame(coordinateSpace?: string): { x: number; y: number; width: number; height: number };
}

/** Chooses first child that fits */
export function ViewThatFits(options?: { in?: 'horizontal' | 'vertical' }, ...children: View[]): View;

/** Alignment options */
export const Alignment: {
  center: string;
  leading: string;
  trailing: string;
  top: string;
  bottom: string;
  topLeading: string;
  topTrailing: string;
  bottomLeading: string;
  bottomTrailing: string;
};

export const HorizontalAlignment: {
  leading: string;
  center: string;
  trailing: string;
};

export const VerticalAlignment: {
  top: string;
  center: string;
  bottom: string;
  firstTextBaseline: string;
  lastTextBaseline: string;
};

// =============================================================================
// Lists & Collections
// =============================================================================

/** Scrollable list of items */
export function List(options: ListOptions | View, ...children: View[]): View & {
  /** Set list style */
  listStyle(style: ListStyle): View;
};

export interface ListOptions {
  selection?: Binding<any>;
}

/** List style presets */
export const ListStyle: {
  automatic: string;
  plain: string;
  inset: string;
  grouped: string;
  insetGrouped: string;
  sidebar: string;
};

/** Iterate over a collection */
export function ForEach<T>(
  data: T[],
  content: (item: T, index: number) => View
): View;
export function ForEach<T>(
  data: T[],
  options: { id: keyof T | ((item: T) => any) },
  content: (item: T, index: number) => View
): View;

/** Create a range of numbers */
export function Range(start: number, end: number): number[];

/** Group items with header/footer */
export function Section(
  options: { header?: View | string; footer?: View | string },
  ...children: View[]
): View;

// =============================================================================
// Containers
// =============================================================================

/** Scrollable container */
export function ScrollView(
  options: { axis?: 'vertical' | 'horizontal' | 'both'; showsIndicators?: boolean },
  ...children: View[]
): View;
export function ScrollView(...children: View[]): View;

/** Logical grouping (no visual effect) */
export function Group(...children: View[]): View;

/** Form container for settings/input */
export function Form(...children: View[]): View & {
  /** Set form style */
  formStyle(style: FormStyle): View;
};

/** Form style presets */
export const FormStyle: {
  automatic: string;
  grouped: string;
  columns: string;
};

/** Expandable/collapsible section */
export function DisclosureGroup(
  label: string | View,
  options?: { isExpanded?: Binding<boolean> },
  ...children: View[]
): View;

// =============================================================================
// Navigation
// =============================================================================

/** Navigation container with push/pop stack */
export function NavigationStack(
  options?: { path?: NavigationPath },
  ...children: View[]
): View & {
  /** Set navigation title */
  navigationTitle(title: string): View;
  /** Set navigation bar hidden */
  navigationBarHidden(hidden: boolean): View;
  /** Configure toolbar */
  toolbar(content: () => View): View;
  /** Define navigation destinations */
  navigationDestination<T>(for: new () => T, destination: (value: T) => View): View;
};

/** Trigger navigation to a destination */
export function NavigationLink(
  label: string | View,
  options: { destination?: View; value?: any }
): View;

/** Navigation path for programmatic navigation */
export class NavigationPath {
  constructor(path?: any[]);

  /** Number of items in path */
  count: number;

  /** Whether path is empty */
  isEmpty: boolean;

  /** Push a value onto the path */
  append(value: any): void;

  /** Pop the last value */
  removeLast(k?: number): void;

  /** Clear the path */
  clear(): void;
}

/** Multi-column navigation (iPad/Mac style) */
export function NavigationSplitView(
  options: { columnVisibility?: Binding<NavigationSplitViewVisibility> },
  sidebar: () => View,
  content?: () => View,
  detail?: () => View
): View;

/** Split view visibility options */
export const NavigationSplitViewVisibility: {
  automatic: string;
  all: string;
  doubleColumn: string;
  detailOnly: string;
};

/** Tab bar navigation */
export function TabView(
  options?: { selection?: Binding<any> },
  ...children: View[]
): View & {
  /** Set tab view style */
  tabViewStyle(style: TabViewStyle): View;
};

/** Tab view style presets */
export const TabViewStyle: {
  automatic: string;
  page: string;
  pageAlwaysVisible: string;
};

// =============================================================================
// Shapes
// =============================================================================

/** Base shape interface */
export interface Shape extends View {
  /** Fill the shape with a color */
  fill(color: Color | string): View;
  /** Stroke the shape outline */
  stroke(color: Color | string, lineWidth?: number): View;
  /** Stroke with style options */
  strokeBorder(color: Color | string, lineWidth?: number): View;
}

/** Rectangle shape */
export function Rectangle(): Shape;

/** Rounded rectangle shape */
export function RoundedRectangle(options: { cornerRadius: number } | { cornerSize: { width: number; height: number } }): Shape;

/** Circle shape */
export function Circle(): Shape;

/** Ellipse/oval shape */
export function Ellipse(): Shape;

/** Capsule/pill shape */
export function Capsule(): Shape;

/** Custom path shape */
export function Path(builder: (path: PathBuilder) => void): Shape;

/** Path builder interface */
export interface PathBuilder {
  move(to: { x: number; y: number }): void;
  addLine(to: { x: number; y: number }): void;
  addQuadCurve(to: { x: number; y: number }, control: { x: number; y: number }): void;
  addCurve(to: { x: number; y: number }, control1: { x: number; y: number }, control2: { x: number; y: number }): void;
  addArc(center: { x: number; y: number }, radius: number, startAngle: number, endAngle: number, clockwise?: boolean): void;
  addRect(rect: { x: number; y: number; width: number; height: number }): void;
  addRoundedRect(rect: { x: number; y: number; width: number; height: number }, cornerSize: { width: number; height: number }): void;
  addEllipse(in_: { x: number; y: number; width: number; height: number }): void;
  closeSubpath(): void;
}

// =============================================================================
// Graphics
// =============================================================================

/** Color type with system colors and custom initialization */
export class Color {
  /** Create color from hex string */
  static hex(hex: string): Color;
  /** Create color from RGB values (0-255) */
  static rgb(r: number, g: number, b: number, a?: number): Color;
  /** Create color from HSB values */
  static hsb(h: number, s: number, b: number, a?: number): Color;

  /** Adjust opacity */
  opacity(value: number): Color;

  // System Colors
  static readonly blue: Color;
  static readonly red: Color;
  static readonly green: Color;
  static readonly orange: Color;
  static readonly yellow: Color;
  static readonly pink: Color;
  static readonly purple: Color;
  static readonly teal: Color;
  static readonly cyan: Color;
  static readonly indigo: Color;
  static readonly mint: Color;
  static readonly brown: Color;
  static readonly gray: Color;
  static readonly black: Color;
  static readonly white: Color;
  static readonly clear: Color;

  // Semantic Colors
  static readonly primary: Color;
  static readonly secondary: Color;
  static readonly accentColor: Color;

  // Background Colors
  static readonly systemBackground: Color;
  static readonly secondarySystemBackground: Color;
  static readonly tertiarySystemBackground: Color;

  // Label Colors
  static readonly label: Color;
  static readonly secondaryLabel: Color;
  static readonly tertiaryLabel: Color;
  static readonly quaternaryLabel: Color;
}

/** Font type with system fonts and custom initialization */
export class Font {
  /** Create system font with size and weight */
  static system(size: number, weight?: FontWeight, design?: FontDesign): Font;
  /** Create custom font */
  static custom(name: string, size: number): Font;

  // Preset Fonts
  static readonly largeTitle: Font;
  static readonly title: Font;
  static readonly title2: Font;
  static readonly title3: Font;
  static readonly headline: Font;
  static readonly subheadline: Font;
  static readonly body: Font;
  static readonly callout: Font;
  static readonly footnote: Font;
  static readonly caption: Font;
  static readonly caption2: Font;

  /** Apply weight to font */
  weight(weight: FontWeight): Font;
  /** Apply italic style */
  italic(): Font;
  /** Apply bold weight */
  bold(): Font;
  /** Use monospaced design */
  monospaced(): Font;
}

/** Font weight options */
export type FontWeight =
  | 'ultraLight' | 'thin' | 'light' | 'regular'
  | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black';

/** Font design options */
export type FontDesign = 'default' | 'rounded' | 'serif' | 'monospaced';

/** Text alignment options */
export type TextAlignment = 'leading' | 'center' | 'trailing';

/** Text truncation mode */
export type TruncationMode = 'head' | 'middle' | 'tail';

/** Linear gradient */
export function LinearGradient(options: {
  colors: Color[];
  startPoint?: UnitPoint;
  endPoint?: UnitPoint;
}): View;

/** Radial gradient */
export function RadialGradient(options: {
  colors: Color[];
  center?: UnitPoint;
  startRadius?: number;
  endRadius?: number;
}): View;

/** Angular/conic gradient */
export function AngularGradient(options: {
  colors: Color[];
  center?: UnitPoint;
  startAngle?: number;
  endAngle?: number;
}): View;

/** Unit point for gradient positions */
export const UnitPoint: {
  zero: { x: number; y: number };
  center: { x: number; y: number };
  leading: { x: number; y: number };
  trailing: { x: number; y: number };
  top: { x: number; y: number };
  bottom: { x: number; y: number };
  topLeading: { x: number; y: number };
  topTrailing: { x: number; y: number };
  bottomLeading: { x: number; y: number };
  bottomTrailing: { x: number; y: number };
};

// =============================================================================
// Animation
// =============================================================================

/** Animate changes within the block */
export function withAnimation(animation?: Animation, body?: () => void): void;
export function withAnimation(body: () => void): void;

/** Animation configuration */
export class Animation {
  /** Default animation */
  static readonly default: Animation;

  /** Linear animation */
  static linear(duration?: number): Animation;

  /** Ease in animation */
  static easeIn(duration?: number): Animation;

  /** Ease out animation */
  static easeOut(duration?: number): Animation;

  /** Ease in and out animation */
  static easeInOut(duration?: number): Animation;

  /** Spring animation */
  static spring(options?: {
    response?: number;
    dampingFraction?: number;
    blendDuration?: number;
  }): Animation;

  /** Bouncy spring */
  static bouncy(duration?: number, extraBounce?: number): Animation;

  /** Smooth spring */
  static smooth(duration?: number): Animation;

  /** Snappy spring */
  static snappy(duration?: number): Animation;

  /** Interactive spring */
  static interactiveSpring(response?: number, dampingFraction?: number): Animation;

  /** Set animation delay */
  delay(delay: number): Animation;

  /** Set animation speed */
  speed(speed: number): Animation;

  /** Repeat animation */
  repeatCount(count: number, autoreverses?: boolean): Animation;

  /** Repeat forever */
  repeatForever(autoreverses?: boolean): Animation;
}

/** Transition for view insertion/removal */
export class AnyTransition {
  /** Fade transition */
  static readonly opacity: AnyTransition;

  /** Scale transition */
  static scale(scale?: number, anchor?: UnitPoint): AnyTransition;

  /** Slide transition */
  static readonly slide: AnyTransition;

  /** Move from edge */
  static move(edge: 'top' | 'bottom' | 'leading' | 'trailing'): AnyTransition;

  /** Offset transition */
  static offset(x?: number, y?: number): AnyTransition;

  /** Asymmetric insertion/removal */
  static asymmetric(insertion: AnyTransition, removal: AnyTransition): AnyTransition;

  /** Combine transitions */
  combined(with_: AnyTransition): AnyTransition;

  /** Set animation for transition */
  animation(animation: Animation): AnyTransition;
}

/** Namespace for matched geometry effect */
export class Namespace {
  constructor();
  readonly id: symbol;
}

// =============================================================================
// Gestures
// =============================================================================

/** Base gesture interface */
export interface Gesture {
  onChanged(action: (value: any) => void): Gesture;
  onEnded(action: (value: any) => void): Gesture;
}

/** Tap gesture */
export function TapGesture(count?: number): Gesture;

/** Long press gesture */
export function LongPressGesture(minimumDuration?: number): Gesture & {
  onEnded(action: () => void): Gesture;
};

/** Drag gesture */
export function DragGesture(options?: { minimumDistance?: number }): Gesture & {
  onChanged(action: (value: DragGestureValue) => void): Gesture;
  onEnded(action: (value: DragGestureValue) => void): Gesture;
};

/** Drag gesture value */
export interface DragGestureValue {
  translation: { width: number; height: number };
  location: { x: number; y: number };
  startLocation: { x: number; y: number };
  velocity: { width: number; height: number };
  predictedEndLocation: { x: number; y: number };
  predictedEndTranslation: { width: number; height: number };
}

/** Magnification (pinch) gesture */
export function MagnificationGesture(): Gesture & {
  onChanged(action: (scale: number) => void): Gesture;
  onEnded(action: (scale: number) => void): Gesture;
};

/** Rotation gesture */
export function RotationGesture(): Gesture & {
  onChanged(action: (angle: number) => void): Gesture;
  onEnded(action: (angle: number) => void): Gesture;
};

// =============================================================================
// App Lifecycle
// =============================================================================

/** Create and mount an app */
export function App(content: () => View): {
  /** Mount to a DOM element */
  mount(selector: string | HTMLElement): void;
  /** Refresh the UI */
  refresh(): void;
};

/** Window group scene container */
export function WindowGroup(
  title?: string,
  content?: () => View
): View;

/** Window resizability options */
export const WindowResizability: {
  automatic: string;
  contentSize: string;
  contentMinSize: string;
};

/** Scene protocol */
export class Scene {}

/** Settings scene (macOS) */
export function Settings(content: () => View): View;

/** Document-based app scene */
export function DocumentGroup(
  options: { newDocument: () => any; editor: (document: any) => View }
): View;

// =============================================================================
// View Builder Helpers
// =============================================================================

/** Empty view (renders nothing) */
export function EmptyView(): View;

/** Wrap any view */
export function AnyView(view: View): View;

/** Build view from function or views */
export function buildView(...views: (View | View[] | null | undefined)[]): View;

/** Logical grouping */
export function Group(...children: View[]): View;

// =============================================================================
// Default Export
// =============================================================================

declare const SwiftUI: {
  // All exports available as properties
  VERSION: string;
  View: typeof View;
  Text: typeof Text;
  Image: typeof Image;
  Label: typeof Label;
  Button: typeof Button;
  TextField: typeof TextField;
  SecureField: typeof SecureField;
  Toggle: typeof Toggle;
  Slider: typeof Slider;
  Stepper: typeof Stepper;
  Picker: typeof Picker;
  DatePicker: typeof DatePicker;
  ColorPicker: typeof ColorPicker;
  Menu: typeof Menu;
  VStack: typeof VStack;
  HStack: typeof HStack;
  ZStack: typeof ZStack;
  LazyVStack: typeof LazyVStack;
  LazyHStack: typeof LazyHStack;
  Spacer: typeof Spacer;
  Divider: typeof Divider;
  Grid: typeof Grid;
  GridRow: typeof GridRow;
  GridItem: typeof GridItem;
  LazyVGrid: typeof LazyVGrid;
  LazyHGrid: typeof LazyHGrid;
  GeometryReader: typeof GeometryReader;
  ViewThatFits: typeof ViewThatFits;
  List: typeof List;
  ForEach: typeof ForEach;
  Range: typeof Range;
  Section: typeof Section;
  ScrollView: typeof ScrollView;
  Group: typeof Group;
  Form: typeof Form;
  DisclosureGroup: typeof DisclosureGroup;
  NavigationStack: typeof NavigationStack;
  NavigationLink: typeof NavigationLink;
  NavigationPath: typeof NavigationPath;
  NavigationSplitView: typeof NavigationSplitView;
  TabView: typeof TabView;
  Rectangle: typeof Rectangle;
  RoundedRectangle: typeof RoundedRectangle;
  Circle: typeof Circle;
  Ellipse: typeof Ellipse;
  Capsule: typeof Capsule;
  Path: typeof Path;
  Color: typeof Color;
  Font: typeof Font;
  LinearGradient: typeof LinearGradient;
  RadialGradient: typeof RadialGradient;
  AngularGradient: typeof AngularGradient;
  Animation: typeof Animation;
  AnyTransition: typeof AnyTransition;
  Namespace: typeof Namespace;
  withAnimation: typeof withAnimation;
  TapGesture: typeof TapGesture;
  LongPressGesture: typeof LongPressGesture;
  DragGesture: typeof DragGesture;
  MagnificationGesture: typeof MagnificationGesture;
  RotationGesture: typeof RotationGesture;
  State: typeof State;
  Binding: typeof Binding;
  ObservableObject: typeof ObservableObject;
  Published: typeof Published;
  StateObject: typeof StateObject;
  Observable: typeof Observable;
  Environment: typeof Environment;
  EnvironmentObject: typeof EnvironmentObject;
  EnvironmentValues: typeof EnvironmentValues;
  App: typeof App;
  WindowGroup: typeof WindowGroup;
  Settings: typeof Settings;
  // Style constants
  Alignment: typeof Alignment;
  HorizontalAlignment: typeof HorizontalAlignment;
  VerticalAlignment: typeof VerticalAlignment;
  ContentMode: typeof ContentMode;
  ButtonStyle: typeof ButtonStyle;
  ToggleStyle: typeof ToggleStyle;
  PickerStyle: typeof PickerStyle;
  ListStyle: typeof ListStyle;
  FormStyle: typeof FormStyle;
  TabViewStyle: typeof TabViewStyle;
  ColorScheme: typeof ColorScheme;
  UserInterfaceSizeClass: typeof UserInterfaceSizeClass;
  UnitPoint: typeof UnitPoint;
};

export default SwiftUI;
