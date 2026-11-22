// Todo: a view model, a keyed reactive ForEach, Show and two-way bindings.
import {
  App, VStack, HStack, Text, TextField, Button, Toggle, ForEach, Show, Spacer,
  ObservableObject, Binding, Color, Font
} from 'swiftui-for-web';

class TodoViewModel extends ObservableObject {
  constructor() {
    super();
    this.published('todos', [
      { id: 1, title: 'Read the 3.1 migration guide', done: true },
      { id: 2, title: 'Try the Playground', done: false },
    ]);
    this.published('draft', '');
    this.nextID = 3;
  }

  add() {
    const title = this.draft.trim();
    if (!title) return;
    this.todos = [...this.todos, { id: this.nextID++, title, done: false }];
    this.draft = '';
  }

  toggle(id) {
    this.todos = this.todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
  }

  remove(id) {
    this.todos = this.todos.filter((todo) => todo.id !== id);
  }
}

const vm = new TodoViewModel();

const TodoRow = (todo) =>
  HStack({ spacing: 12 },
    // A Binding with a getter and a setter: the view model stays the source of truth.
    Toggle(todo.title, new Binding(() => todo.done, () => vm.toggle(todo.id)))
      .toggleStyle('checkbox'),
    Spacer(),
    Button('Delete', () => vm.remove(todo.id)).foregroundColor(Color.red)
  )
  .padding(10)
  .background(Color.secondarySystemBackground)
  .cornerRadius(8);

const TodoView = () =>
  VStack({ alignment: 'leading', spacing: 14 },
    Text('My Todos').font(Font.largeTitle),
    HStack({ spacing: 8 },
      TextField('Add a todo…', vm.binding('draft'))
        .onCommit(() => vm.add())
        .padding(8)
        .background(Color.secondarySystemBackground)
        .cornerRadius(8),
      Button('Add', () => vm.add())
        .padding({ horizontal: 14, vertical: 8 })
        .background(Color.blue)
        .foregroundColor(Color.white)
        .cornerRadius(8)
    ),
    // A function makes ForEach reactive and keyed by `id`.
    ForEach(() => vm.todos, { id: 'id' }, TodoRow),
    Show(
      () => vm.todos.length === 0,
      Text('Nothing to do.').foregroundColor(Color.secondary),
      Text(() => `${vm.todos.filter((todo) => !todo.done).length} left`).foregroundColor(Color.secondary)
    )
  )
  .padding(24);

App(TodoView).mount('#root');
