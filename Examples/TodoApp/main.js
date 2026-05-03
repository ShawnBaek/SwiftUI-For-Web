/**
 * Todo App - SwiftUI for Web (signals engine)
 *
 * Full MVVM example: ObservableObject view model + TextField binding +
 * dynamic list (For) + conditional rendering (Show). No app.refresh()
 * anywhere — state writes propagate automatically through tracked
 * effects.
 */

import {
  App,
  VStack,
  HStack,
  Text,
  TextField,
  Button,
  Toggle,
  For,
  Show,
  Spacer,
  Color,
  Font,
  ObservableObject,
} from '../../src/index.js';

// =============================================================================
// Model
// =============================================================================

class TodoItem {
  constructor(id, title, isCompleted = false) {
    this.id = id;
    this.title = title;
    this.isCompleted = isCompleted;
  }
}

// =============================================================================
// ViewModel
// =============================================================================

class TodoViewModel extends ObservableObject {
  constructor() {
    super();
    this.published('todos', []);
    this.published('newTodoText', '');
    this.published('filter', 'all'); // 'all' | 'active' | 'completed'
  }

  get filteredTodos() {
    switch (this.filter) {
      case 'active':    return this.todos.filter(t => !t.isCompleted);
      case 'completed': return this.todos.filter(t => t.isCompleted);
      default:          return this.todos;
    }
  }

  get activeCount() { return this.todos.filter(t => !t.isCompleted).length; }
  get hasCompleted() { return this.todos.some(t => t.isCompleted); }

  addTodo() {
    const text = this.newTodoText.trim();
    if (text) {
      this.todos = [...this.todos, new TodoItem(Date.now(), text, false)];
      this.newTodoText = '';
    }
  }

  toggleTodo(id) {
    this.todos = this.todos.map(todo =>
      todo.id === id ? new TodoItem(todo.id, todo.title, !todo.isCompleted) : todo
    );
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }

  clearCompleted() {
    this.todos = this.todos.filter(todo => !todo.isCompleted);
  }

  setFilter(filter) { this.filter = filter; }
}

// =============================================================================
// View
// =============================================================================

/**
 * FilterButton — picks an "active" or "inactive" rendering depending on
 * whether this filter is selected. Show swaps the two on filter change.
 */
function FilterButton(label, filterValue, vm) {
  return Show(
    () => vm.filter === filterValue,
    Button(label, () => vm.setFilter(filterValue))
      .padding({ vertical: 8, horizontal: 12 })
      .background(Color.blue)
      .foregroundColor('white')
      .cornerRadius(6),
    Button(label, () => vm.setFilter(filterValue))
      .padding({ vertical: 8, horizontal: 12 })
      .background(Color.gray.opacity(0.1))
      .foregroundColor(Color.primary.rgba())
      .cornerRadius(6),
  );
}

/**
 * TodoItemRow — one row. Re-rendered whenever the underlying todo's
 * identity changes (toggleTodo creates a new TodoItem with the same id;
 * For's identity-aware shim remounts the row).
 */
function TodoItemRow(todo, vm) {
  return HStack({ spacing: 12 },
    Button(todo.isCompleted ? '✓' : '○', () => vm.toggleTodo(todo.id))
      .foregroundColor(todo.isCompleted ? Color.green.rgba() : Color.gray.rgba())
      .font(Font.title2),

    Text(todo.title)
      .font(Font.body)
      .foregroundColor(todo.isCompleted ? Color.gray : Color.primary)
      .strikethrough(todo.isCompleted),

    Spacer(),

    Button('×', () => vm.deleteTodo(todo.id))
      .foregroundColor(Color.red.rgba())
      .font(Font.title2)
      .opacity(0.6)
  )
  .padding({ vertical: 12, horizontal: 16 })
  .background(Color.secondarySystemBackground.rgba())
  .cornerRadius(8);
}

function TodoAppView(vm) {
  return App(() =>
    VStack({ alignment: 'leading', spacing: 0 },
      // Header
      Text('My Todos')
        .font(Font.largeTitle)
        .foregroundColor(Color.primary)
        .padding({ bottom: 20 }),

      // Input row
      HStack({ spacing: 12 },
        TextField('What needs to be done?', vm.binding('newTodoText'))
          .textFieldStyle('roundedBorder')
          .padding({ vertical: 12, horizontal: 16 }),

        Button('Add', () => vm.addTodo())
          .padding({ vertical: 12, horizontal: 20 })
          .background(Color.blue)
          .foregroundColor('white')
          .cornerRadius(8)
      )
      .padding({ bottom: 16 }),

      // Filters + active count
      HStack({ spacing: 8 },
        FilterButton('All', 'all', vm),
        FilterButton('Active', 'active', vm),
        FilterButton('Completed', 'completed', vm),
        Spacer(),
        // Reactive text — re-runs when activeCount (i.e. todos) changes.
        Text(() => `${vm.activeCount} items left`)
          .font(Font.caption)
          .foregroundColor(Color.gray)
      )
      .padding({ bottom: 16 }),

      // Todo list — keyed by todo.id, remounted when item identity changes
      VStack({ alignment: 'leading', spacing: 8 },
        For(
          () => vm.filteredTodos,
          (todo) => TodoItemRow(todo, vm),
          (todo) => todo.id,
        )
      ),

      // Empty state
      Show(
        () => vm.filteredTodos.length === 0,
        // Two-arg Show so we can branch the message text on filter:
        Text(() => vm.filter === 'all' ? 'No todos yet. Add one above!' : `No ${vm.filter} todos.`)
          .font(Font.body)
          .foregroundColor(Color.gray)
          .padding({ vertical: 40 })
      ),

      // Footer (only when at least one todo is completed)
      Show(
        () => vm.hasCompleted,
        Button('Clear Completed', () => vm.clearCompleted())
          .foregroundColor(Color.red)
          .padding({ top: 16 })
      ),
    )
    .padding(20)
  );
}

// =============================================================================
// App init
// =============================================================================

const viewModel = new TodoViewModel();

// Sample data
viewModel.todos = [
  new TodoItem(1, 'Learn SwiftUI for Web'),
  new TodoItem(2, 'Build a todo app', true),
  new TodoItem(3, 'Share with the community'),
];

const app = TodoAppView(viewModel);
app.mount('#root');

console.log('Todo App initialized with', viewModel.todos.length, 'todos');
