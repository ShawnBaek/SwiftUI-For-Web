/**
 * Counter Example
 * Demonstrates State management and Button interaction
 */

import {
  App,
  VStack,
  HStack,
  Text,
  Button,
  Spacer,
  State,
  Color,
  Font
} from '../../src/index.js';

// Create reactive state
const count = new State(0);

// Debounced refresh to prevent excessive re-renders
let app; // Will be initialized after mount
let refreshPending = false;
function debouncedRefresh() {
  if (refreshPending || !app) return;
  refreshPending = true;
  requestAnimationFrame(() => {
    refreshPending = false;
    app.refresh();
  });
}

// Define the content view
const CounterView = () =>
  VStack({ spacing: 24 },
    // Title
    Text('Counter')
      .font(Font.title)
      .foregroundColor(Color.primary),

    // Count display
    Text(String(count.value))
      .font(Font.system(72, Font.Weight.bold))
      .foregroundColor(Color.blue)
      .monospacedDigit(),

    // Control buttons
    HStack({ spacing: 16 },
      // Decrement button
      Button('−', () => {
        count.value--;
        debouncedRefresh();
      })
        .font(Font.title)
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.red)
        .foregroundColor(Color.white)
        .cornerRadius(12),

      // Reset button
      Button('Reset', () => {
        count.value = 0;
        debouncedRefresh();
      })
        .font(Font.body)
        .padding({ horizontal: 20, vertical: 12 })
        .background(Color.gray)
        .foregroundColor(Color.white)
        .cornerRadius(12),

      // Increment button
      Button('+', () => {
        count.value++;
        debouncedRefresh();
      })
        .font(Font.title)
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.green)
        .foregroundColor(Color.white)
        .cornerRadius(12)
    ),

    Spacer({ minLength: 20 }),

    // Info text
    Text('Click the buttons to change the count')
      .font(Font.caption)
      .foregroundColor(Color.secondary)
  )
  .padding(40)
  .background(Color.secondarySystemBackground)
  .cornerRadius(20);

// Mount the app
app = App(CounterView).mount('#root');
