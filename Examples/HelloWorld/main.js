/**
 * Hello World Example
 * Demonstrates basic SwiftUI-For-Web usage
 */

import { App, VStack, HStack, Text, Spacer, Color, Font } from '../../src/index.js';

// Define the content view
const ContentView = () =>
  VStack({ spacing: 16 },
    // Title
    Text('Hello, SwiftUI for Web!')
      .font(Font.largeTitle)
      .foregroundColor(Color.blue),

    // Subtitle
    Text('Built with pure JavaScript, CSS, and HTML')
      .font(Font.subheadline)
      .foregroundColor(Color.secondary),

    // Spacer to add some breathing room
    Spacer({ minLength: 20 }),

    // Feature list
    VStack({ alignment: 'leading', spacing: 8 },
      FeatureRow('Zero dependencies'),
      FeatureRow('Declarative syntax'),
      FeatureRow('SwiftUI-inspired API'),
      FeatureRow('Modifier chaining')
    )
    .padding(20)
    .background(Color.secondarySystemBackground)
    .cornerRadius(12)
  )
  .padding(40);

// Helper function for feature rows
const FeatureRow = (label) =>
  HStack({ spacing: 8 },
    Text('✓')
      .foregroundColor(Color.green)
      .bold(),
    Text(label)
      .font(Font.body)
  );

// Mount the app
App(ContentView).mount('#root');
