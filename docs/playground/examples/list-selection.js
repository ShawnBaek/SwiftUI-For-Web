// List with selection: a WAI-ARIA listbox. Click a row, or focus the list
// and use the arrow keys, Home, End and Space.
import { App, VStack, List, Text, State, Color, Font } from 'swiftui-for-web';

const fruits = [
  { id: 'apple', name: 'Apple', emoji: '🍎' },
  { id: 'banana', name: 'Banana', emoji: '🍌' },
  { id: 'cherry', name: 'Cherry', emoji: '🍒' },
  { id: 'grape', name: 'Grape', emoji: '🍇' },
];

const selection = new State('banana');

const FruitList = () =>
  VStack({ alignment: 'leading', spacing: 12 },
    Text('Fruit').font(Font.title2),
    List(fruits, { id: 'id', selection: selection.binding }, (fruit) =>
      Text(`${fruit.emoji}  ${fruit.name}`)
    ),
    Text(() => {
      const fruit = fruits.find((item) => item.id === selection.value);
      return fruit ? `Selected: ${fruit.name}` : 'Nothing selected';
    }).foregroundColor(Color.secondary)
  )
  .padding(20);

App(FruitList).mount('#root');
