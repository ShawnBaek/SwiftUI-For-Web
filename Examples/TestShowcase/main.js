/**
 * Component Test Showcase
 * Renders all SwiftUI-For-Web components for E2E testing
 */

import SwiftUI from '../../src/index.js';

const {
  // Core
  App, VStack, HStack, ZStack, Spacer, Divider,
  // Views
  Text, Image, Label, LabelStyle,
  // Controls
  Button, TextField, SecureField, Toggle, Slider, Stepper, Picker, Menu, DatePicker, ColorPicker,
  // Lists
  List, ForEach, Section,
  // Containers
  ScrollView, Group, Form, DisclosureGroup,
  // Navigation
  NavigationStack, NavigationLink, TabView,
  // Layout
  Grid, GridRow, LazyVStack, LazyHStack, LazyVGrid, LazyHGrid, GridItem, GeometryReader, ViewThatFits,
  // Shapes
  Rectangle, RoundedRectangle, Circle, Ellipse, Capsule, Path,
  // Graphics
  Color, Font, LinearGradient, RadialGradient,
  // State
  State, Binding, ObservableObject, createState
} = SwiftUI;

// =============================================================================
// State Management Test ViewModel
// =============================================================================

class TestViewModel extends ObservableObject {
  constructor() {
    super();
    this.published('counter', 0);
    this.published('text', 'Hello');
    this.published('isOn', false);
    this.published('sliderValue', 50);
    this.published('items', ['Item 1', 'Item 2', 'Item 3']);
    this.published('selectedTab', 0);
  }

  increment() {
    this.counter++;
  }

  decrement() {
    this.counter--;
  }

  addItem() {
    this.items = [...this.items, `Item ${this.items.length + 1}`];
  }

  removeItem(index) {
    this.items = this.items.filter((_, i) => i !== index);
  }

  updateText(newText) {
    this.text = newText;
  }
}

const vm = new TestViewModel();

// =============================================================================
// Section Components
// =============================================================================

const SectionHeader = (title) =>
  Text(title)
    .font(Font.system(18, Font.Weight.bold))
    .foregroundColor(Color.hex('#1d1d1f'))
    .padding({ bottom: 10 });

const ComponentLabel = (label) =>
  Text(label)
    .font(Font.system(12))
    .foregroundColor(Color.hex('#86868b'));

// =============================================================================
// Layout Components Section
// =============================================================================

const LayoutSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('Layout Components'),

    // VStack
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('VStack'),
      VStack({ spacing: 4 },
        Text('VStack Item 1').modifier({ apply(el) { el.dataset.testid = 'vstack-item-1'; } }),
        Text('VStack Item 2').modifier({ apply(el) { el.dataset.testid = 'vstack-item-2'; } }),
        Text('VStack Item 3').modifier({ apply(el) { el.dataset.testid = 'vstack-item-3'; } })
      )
      .padding(10)
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
      .modifier({ apply(el) { el.dataset.testid = 'vstack-container'; } })
    ),

    // HStack
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('HStack'),
      HStack({ spacing: 8 },
        Text('H1').modifier({ apply(el) { el.dataset.testid = 'hstack-item-1'; } }),
        Text('H2').modifier({ apply(el) { el.dataset.testid = 'hstack-item-2'; } }),
        Text('H3').modifier({ apply(el) { el.dataset.testid = 'hstack-item-3'; } })
      )
      .padding(10)
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
      .modifier({ apply(el) { el.dataset.testid = 'hstack-container'; } })
    ),

    // ZStack
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('ZStack'),
      ZStack({ alignment: 'center' },
        Rectangle()
          .fill(Color.blue)
          .frame({ width: 100, height: 60 })
          .modifier({ apply(el) { el.dataset.testid = 'zstack-back'; } }),
        Text('ZStack')
          .foregroundColor(Color.white)
          .modifier({ apply(el) { el.dataset.testid = 'zstack-front'; } })
      )
      .modifier({ apply(el) { el.dataset.testid = 'zstack-container'; } })
    ),

    // Spacer
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Spacer'),
      HStack({ spacing: 0 },
        Text('Left').modifier({ apply(el) { el.dataset.testid = 'spacer-left'; } }),
        Spacer().modifier({ apply(el) { el.dataset.testid = 'spacer'; } }),
        Text('Right').modifier({ apply(el) { el.dataset.testid = 'spacer-right'; } })
      )
      .frame({ width: 200 })
      .padding(10)
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
    ),

    // Divider
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Divider'),
      VStack({ spacing: 8 },
        Text('Above Divider'),
        Divider().modifier({ apply(el) { el.dataset.testid = 'divider'; } }),
        Text('Below Divider')
      )
      .padding(10)
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
    ),

    // Grid
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Grid'),
      Grid({ horizontalSpacing: 8, verticalSpacing: 8 },
        GridRow(
          Text('R1C1').modifier({ apply(el) { el.dataset.testid = 'grid-r1c1'; } }),
          Text('R1C2').modifier({ apply(el) { el.dataset.testid = 'grid-r1c2'; } })
        ),
        GridRow(
          Text('R2C1').modifier({ apply(el) { el.dataset.testid = 'grid-r2c1'; } }),
          Text('R2C2').modifier({ apply(el) { el.dataset.testid = 'grid-r2c2'; } })
        )
      )
      .padding(10)
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
      .modifier({ apply(el) { el.dataset.testid = 'grid-container'; } })
    ),

    // GeometryReader
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('GeometryReader'),
      GeometryReader((geometry) =>
        VStack(
          Text(`Width: ${Math.round(geometry.size.width)}`).modifier({ apply(el) { el.dataset.testid = 'geometry-width'; } }),
          Text(`Height: ${Math.round(geometry.size.height)}`).modifier({ apply(el) { el.dataset.testid = 'geometry-height'; } })
        )
      )
      .frame({ width: 150, height: 60 })
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
      .modifier({ apply(el) { el.dataset.testid = 'geometry-reader'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'layout-section'; } });

// =============================================================================
// View Components Section
// =============================================================================

const ViewSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('View Components'),

    // Text with modifiers
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Text'),
      VStack({ alignment: 'leading', spacing: 4 },
        Text('Plain Text').modifier({ apply(el) { el.dataset.testid = 'text-plain'; } }),
        Text('Bold Text').bold().modifier({ apply(el) { el.dataset.testid = 'text-bold'; } }),
        Text('Italic Text').italic().modifier({ apply(el) { el.dataset.testid = 'text-italic'; } }),
        Text('Colored Text').foregroundColor(Color.blue).modifier({ apply(el) { el.dataset.testid = 'text-colored'; } }),
        Text('Large Title').font(Font.largeTitle).modifier({ apply(el) { el.dataset.testid = 'text-large-title'; } }),
        Text('Caption').font(Font.caption).foregroundColor(Color.gray).modifier({ apply(el) { el.dataset.testid = 'text-caption'; } })
      )
    ),

    // Label
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Label'),
      VStack({ alignment: 'leading', spacing: 8 },
        Label('Star Label', { systemImage: 'star.fill' }).modifier({ apply(el) { el.dataset.testid = 'label-star'; } }),
        Label('Heart Label', { systemImage: 'heart.fill' }).modifier({ apply(el) { el.dataset.testid = 'label-heart'; } }),
        Label('Gear Label', { systemImage: 'gear' }).modifier({ apply(el) { el.dataset.testid = 'label-gear'; } })
      )
    ),

    // Image (using data URL for testing)
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Image'),
      Image('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect fill="#007AFF" width="50" height="50"/></svg>'))
        .frame({ width: 50, height: 50 })
        .cornerRadius(8)
        .modifier({ apply(el) { el.dataset.testid = 'image-test'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'view-section'; } });

// =============================================================================
// Control Components Section
// =============================================================================

const ControlSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('Control Components'),

    // Button
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Button'),
      HStack({ spacing: 8 },
        Button('Primary', () => console.log('Primary clicked'))
          .padding({ horizontal: 16, vertical: 8 })
          .background(Color.blue)
          .foregroundColor(Color.white)
          .cornerRadius(8)
          .modifier({ apply(el) { el.dataset.testid = 'button-primary'; } }),
        Button('Secondary', () => console.log('Secondary clicked'))
          .padding({ horizontal: 16, vertical: 8 })
          .background(Color.gray.opacity(0.2))
          .cornerRadius(8)
          .modifier({ apply(el) { el.dataset.testid = 'button-secondary'; } }),
        Button('Danger', () => console.log('Danger clicked'))
          .foregroundColor(Color.red)
          .modifier({ apply(el) { el.dataset.testid = 'button-danger'; } })
      )
    ),

    // TextField
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('TextField'),
      TextField('Enter text...', vm.binding('text'))
        .textFieldStyle('roundedBorder')
        .frame({ width: 200 })
        .modifier({ apply(el) { el.dataset.testid = 'textfield'; } })
    ),

    // SecureField
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('SecureField'),
      SecureField('Password', vm.binding('text'))
        .textFieldStyle('roundedBorder')
        .frame({ width: 200 })
        .modifier({ apply(el) { el.dataset.testid = 'securefield'; } })
    ),

    // Toggle
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Toggle'),
      HStack({ spacing: 16 },
        Toggle(vm.binding('isOn'))
          .modifier({ apply(el) { el.dataset.testid = 'toggle'; } }),
        Text(vm.isOn ? 'ON' : 'OFF')
          .modifier({ apply(el) { el.dataset.testid = 'toggle-label'; } })
      )
    ),

    // Slider
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Slider'),
      HStack({ spacing: 8 },
        Slider(vm.binding('sliderValue'), { min: 0, max: 100 })
          .frame({ width: 150 })
          .modifier({ apply(el) { el.dataset.testid = 'slider'; } }),
        Text(String(Math.round(vm.sliderValue)))
          .modifier({ apply(el) { el.dataset.testid = 'slider-value'; } })
      )
    ),

    // Stepper
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Stepper'),
      Stepper(`Value: ${vm.counter}`, {
        onIncrement: () => vm.increment(),
        onDecrement: () => vm.decrement()
      })
      .modifier({ apply(el) { el.dataset.testid = 'stepper'; } })
    ),

    // Picker
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Picker'),
      Picker('Select', vm.binding('selectedTab'), [
        { value: 0, label: 'Option 1' },
        { value: 1, label: 'Option 2' },
        { value: 2, label: 'Option 3' }
      ])
      .pickerStyle('segmented')
      .modifier({ apply(el) { el.dataset.testid = 'picker'; } })
    ),

    // DatePicker
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('DatePicker'),
      DatePicker('Select Date')
        .modifier({ apply(el) { el.dataset.testid = 'datepicker'; } })
    ),

    // ColorPicker
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('ColorPicker'),
      ColorPicker('Pick Color')
        .modifier({ apply(el) { el.dataset.testid = 'colorpicker'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'control-section'; } });

// =============================================================================
// List Components Section
// =============================================================================

const ListSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('List Components'),

    // ForEach
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('ForEach'),
      VStack({ alignment: 'leading', spacing: 4 },
        ForEach(vm.items, { id: (item, i) => i }, (item, index) =>
          HStack({ spacing: 8 },
            Text(item).modifier({ apply(el) { el.dataset.testid = `foreach-item-${index}`; } }),
            Button('X', () => vm.removeItem(index))
              .foregroundColor(Color.red)
              .modifier({ apply(el) { el.dataset.testid = `foreach-remove-${index}`; } })
          )
        )
      )
      .modifier({ apply(el) { el.dataset.testid = 'foreach-container'; } }),
      Button('Add Item', () => vm.addItem())
        .padding({ horizontal: 12, vertical: 6 })
        .background(Color.blue)
        .foregroundColor(Color.white)
        .cornerRadius(6)
        .modifier({ apply(el) { el.dataset.testid = 'foreach-add'; } })
    ),

    // List
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('List'),
      List(
        ForEach(['Apple', 'Banana', 'Cherry'], { id: (item) => item }, (item) =>
          Text(item).modifier({ apply(el) { el.dataset.testid = `list-item-${item.toLowerCase()}`; } })
        )
      )
      .frame({ height: 120 })
      .modifier({ apply(el) { el.dataset.testid = 'list-container'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'list-section'; } });

// =============================================================================
// Container Components Section
// =============================================================================

const ContainerSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('Container Components'),

    // ScrollView
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('ScrollView'),
      ScrollView({ axis: 'vertical' },
        VStack({ spacing: 4 },
          ...Array.from({ length: 10 }, (_, i) =>
            Text(`Scroll Item ${i + 1}`).modifier({ apply(el) { el.dataset.testid = `scroll-item-${i + 1}`; } })
          )
        )
      )
      .frame({ height: 100 })
      .background(Color.hex('#f0f0f0'))
      .cornerRadius(8)
      .modifier({ apply(el) { el.dataset.testid = 'scrollview'; } })
    ),

    // Group
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Group'),
      Group(
        Text('Group Item 1').modifier({ apply(el) { el.dataset.testid = 'group-item-1'; } }),
        Text('Group Item 2').modifier({ apply(el) { el.dataset.testid = 'group-item-2'; } })
      )
      .modifier({ apply(el) { el.dataset.testid = 'group-container'; } })
    ),

    // Form with Section
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('Form & Section'),
      Form(
        Section({ header: 'Section Header' },
          Text('Form Item 1').modifier({ apply(el) { el.dataset.testid = 'form-item-1'; } }),
          Text('Form Item 2').modifier({ apply(el) { el.dataset.testid = 'form-item-2'; } })
        )
      )
      .frame({ height: 120 })
      .modifier({ apply(el) { el.dataset.testid = 'form-container'; } })
    ),

    // DisclosureGroup
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('DisclosureGroup'),
      DisclosureGroup('Expand Me',
        Text('Hidden Content 1').modifier({ apply(el) { el.dataset.testid = 'disclosure-content-1'; } }),
        Text('Hidden Content 2').modifier({ apply(el) { el.dataset.testid = 'disclosure-content-2'; } })
      )
      .modifier({ apply(el) { el.dataset.testid = 'disclosure-group'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'container-section'; } });

// =============================================================================
// Shape Components Section
// =============================================================================

const ShapeSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('Shape Components'),

    HStack({ spacing: 16 },
      // Rectangle
      VStack({ spacing: 4 },
        ComponentLabel('Rectangle'),
        Rectangle()
          .fill(Color.blue)
          .frame({ width: 60, height: 40 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-rectangle'; } })
      ),

      // RoundedRectangle
      VStack({ spacing: 4 },
        ComponentLabel('RoundedRect'),
        RoundedRectangle(12)
          .fill(Color.green)
          .frame({ width: 60, height: 40 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-rounded-rectangle'; } })
      ),

      // Circle
      VStack({ spacing: 4 },
        ComponentLabel('Circle'),
        Circle()
          .fill(Color.orange)
          .frame({ width: 50, height: 50 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-circle'; } })
      ),

      // Ellipse
      VStack({ spacing: 4 },
        ComponentLabel('Ellipse'),
        Ellipse()
          .fill(Color.purple)
          .frame({ width: 70, height: 40 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-ellipse'; } })
      ),

      // Capsule
      VStack({ spacing: 4 },
        ComponentLabel('Capsule'),
        Capsule()
          .fill(Color.red)
          .frame({ width: 80, height: 30 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-capsule'; } })
      )
    ),

    // Shapes with stroke
    HStack({ spacing: 16 },
      VStack({ spacing: 4 },
        ComponentLabel('Stroke'),
        Circle()
          .stroke(Color.blue, 3)
          .frame({ width: 50, height: 50 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-stroke'; } })
      ),

      VStack({ spacing: 4 },
        ComponentLabel('Gradient'),
        RoundedRectangle(8)
          .fill(LinearGradient(['#007AFF', '#5856D6'], { direction: 'toRight' }))
          .frame({ width: 80, height: 40 })
          .modifier({ apply(el) { el.dataset.testid = 'shape-gradient'; } })
      )
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'shape-section'; } });

// =============================================================================
// Navigation Components Section
// =============================================================================

const NavigationSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('Navigation Components'),

    // TabView
    VStack({ alignment: 'leading', spacing: 4 },
      ComponentLabel('TabView'),
      TabView(vm.binding('selectedTab'),
        VStack(
          Text('Tab 1 Content').modifier({ apply(el) { el.dataset.testid = 'tab-content-1'; } })
        ).tabItem(() => Label('Home', { systemImage: 'house' })),
        VStack(
          Text('Tab 2 Content').modifier({ apply(el) { el.dataset.testid = 'tab-content-2'; } })
        ).tabItem(() => Label('Settings', { systemImage: 'gear' }))
      )
      .frame({ height: 150 })
      .modifier({ apply(el) { el.dataset.testid = 'tabview'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'navigation-section'; } });

// =============================================================================
// State Management Section (for testing reactive updates)
// =============================================================================

const StateSection = () =>
  VStack({ alignment: 'leading', spacing: 16 },
    SectionHeader('State Management (Reactive Updates)'),

    // Counter test
    VStack({ alignment: 'leading', spacing: 8 },
      ComponentLabel('Counter (ObservableObject)'),
      HStack({ spacing: 12 },
        Button('-', () => vm.decrement())
          .padding({ horizontal: 16, vertical: 8 })
          .background(Color.red)
          .foregroundColor(Color.white)
          .cornerRadius(8)
          .modifier({ apply(el) { el.dataset.testid = 'counter-decrement'; } }),
        Text(String(vm.counter))
          .font(Font.system(24, Font.Weight.bold))
          .frame({ width: 60 })
          .modifier({ apply(el) { el.dataset.testid = 'counter-value'; } }),
        Button('+', () => vm.increment())
          .padding({ horizontal: 16, vertical: 8 })
          .background(Color.green)
          .foregroundColor(Color.white)
          .cornerRadius(8)
          .modifier({ apply(el) { el.dataset.testid = 'counter-increment'; } })
      )
    ),

    // Text binding test
    VStack({ alignment: 'leading', spacing: 8 },
      ComponentLabel('Text Binding'),
      TextField('Type here...', vm.binding('text'))
        .textFieldStyle('roundedBorder')
        .frame({ width: 200 })
        .modifier({ apply(el) { el.dataset.testid = 'binding-input'; } }),
      Text(`Current: ${vm.text}`)
        .modifier({ apply(el) { el.dataset.testid = 'binding-output'; } })
    ),

    // Toggle binding test
    VStack({ alignment: 'leading', spacing: 8 },
      ComponentLabel('Toggle Binding'),
      HStack({ spacing: 12 },
        Toggle(vm.binding('isOn'))
          .modifier({ apply(el) { el.dataset.testid = 'binding-toggle'; } }),
        Text(vm.isOn ? 'Enabled' : 'Disabled')
          .modifier({ apply(el) { el.dataset.testid = 'binding-toggle-status'; } })
      )
    ),

    // Dynamic list test (partial re-rendering)
    VStack({ alignment: 'leading', spacing: 8 },
      ComponentLabel('Dynamic List (Partial Re-render)'),
      Text(`Items: ${vm.items.length}`)
        .modifier({ apply(el) { el.dataset.testid = 'dynamic-list-count'; } }),
      VStack({ alignment: 'leading', spacing: 4 },
        ForEach(vm.items, { id: (item, i) => `${item}-${i}` }, (item, index) =>
          HStack({ spacing: 8 },
            Text(item).modifier({ apply(el) { el.dataset.testid = `dynamic-item-${index}`; } }),
            Button('Remove', () => vm.removeItem(index))
              .foregroundColor(Color.red)
              .font(Font.caption)
              .modifier({ apply(el) { el.dataset.testid = `dynamic-remove-${index}`; } })
          )
          .padding(8)
          .background(Color.hex('#f0f0f0'))
          .cornerRadius(4)
        )
      )
      .modifier({ apply(el) { el.dataset.testid = 'dynamic-list-container'; } }),
      Button('Add Item', () => vm.addItem())
        .padding({ horizontal: 12, vertical: 6 })
        .background(Color.blue)
        .foregroundColor(Color.white)
        .cornerRadius(6)
        .modifier({ apply(el) { el.dataset.testid = 'dynamic-add-item'; } })
    )
  )
  .padding(20)
  .background(Color.white)
  .cornerRadius(12)
  .modifier({ apply(el) { el.dataset.testid = 'state-section'; } });

// =============================================================================
// Main App
// =============================================================================

function TestShowcase() {
  return ScrollView({ axis: 'vertical' },
    VStack({ alignment: 'leading', spacing: 20 },
      LayoutSection(),
      ViewSection(),
      ControlSection(),
      ListSection(),
      ContainerSection(),
      ShapeSection(),
      NavigationSection(),
      StateSection()
    )
    .padding(20)
  )
  .modifier({ apply(el) { el.dataset.testid = 'test-showcase'; } });
}

// Mount the app
const app = App(TestShowcase);
app.mount('#root');

// Set up reactive updates
vm.subscribe(() => {
  app.refresh();
});

// Export for testing access
window.testViewModel = vm;

console.log('Component Test Showcase initialized');
