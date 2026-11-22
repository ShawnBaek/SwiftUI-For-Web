// Counter: State, and views that update when it changes.
import { App, VStack, HStack, Text, Button, State, Color, Font } from 'swiftui-for-web';

const count = new State(0);

const CounterView = () =>
  VStack({ spacing: 20 },
    Text('Counter').font(Font.title),

    // Pass the State itself (or a function) so the text follows it.
    // Text(count.value) would be a snapshot, and logs a dev warning.
    Text(count)
      .font(Font.system(64, Font.Weight.bold))
      .foregroundColor(Color.blue)
      .monospacedDigit(),

    HStack({ spacing: 12 },
      Button('−', () => { count.value -= 1; })
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.red)
        .foregroundColor(Color.white)
        .cornerRadius(10),
      Button('Reset', () => { count.value = 0; })
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.gray)
        .foregroundColor(Color.white)
        .cornerRadius(10),
      Button('+', () => { count.value += 1; })
        .padding({ horizontal: 20, vertical: 10 })
        .background(Color.green)
        .foregroundColor(Color.white)
        .cornerRadius(10)
    ),

    Text(() => (count.value === 0 ? 'Tap a button' : `You tapped ${Math.abs(count.value)} times`))
      .foregroundColor(Color.secondary)
  )
  .padding(32);

App(CounterView).mount('#root');
