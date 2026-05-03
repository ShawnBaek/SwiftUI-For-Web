/**
 * Counter Example — fine-grained reactive engine
 *
 * State management + button interaction. Demonstrates the signals engine:
 * no app.refresh(), no debounced refresh — wrap reactive reads in a thunk
 * (() => state.value) and the framework re-runs only the bound effect on
 * each write.
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

// Reactive state
const count = new State(0);

// Define the content view
const CounterView = () =>
  VStack({ spacing: 24 },
    // Title (static)
    Text('Counter')
      .font(Font.title)
      .foregroundColor(Color.primary),

    // Count display — reactive: thunk auto-tracks `count.value`
    Text(() => String(count.value))
      .font(Font.system(72, Font.Weight.bold))
      .foregroundColor(Color.blue)
      .monospacedDigit(),

    // Control buttons — handlers just mutate state; no manual refresh
    HStack({ spacing: 16 },
      Button('−', () => { count.value--; })
        .font(Font.title)
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.red)
        .foregroundColor(Color.white)
        .cornerRadius(12),

      Button('Reset', () => { count.value = 0; })
        .font(Font.body)
        .padding({ horizontal: 20, vertical: 12 })
        .background(Color.gray)
        .foregroundColor(Color.white)
        .cornerRadius(12),

      Button('+', () => { count.value++; })
        .font(Font.title)
        .padding({ horizontal: 24, vertical: 12 })
        .background(Color.green)
        .foregroundColor(Color.white)
        .cornerRadius(12)
    ),

    Spacer({ minLength: 20 }),

    Text('Click the buttons to change the count')
      .font(Font.caption)
      .foregroundColor(Color.secondary)
  )
  .padding(40)
  .background(Color.secondarySystemBackground)
  .cornerRadius(20);

// Mount.
App(CounterView).mount('#root');
