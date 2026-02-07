/**
 * Todo App - SwiftUI for Web
 *
 * A complete MVVM example demonstrating:
 * - ObservableObject for ViewModel
 * - State management with published properties
 * - Two-way binding with TextField
 * - ForEach for dynamic lists
 * - Button, Toggle, and other controls
 */

import {
  App,
  VStack,
  HStack,
  Text,
  TextField,
  Button,
  Toggle,
  ForEach,
  Spacer,
  Color,
  Font,
  ObservableObject
} from '../../src/index.js';

// =============================================================================
// Model
// =============================================================================

/**
 * TodoItem - represents a single todo item
 */
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

/**
 * TodoViewModel - manages the todo list state
 */
class TodoViewModel extends ObservableObject {
  constructor() {
    super();

    // Published properties (reactive)
    this.published('todos', []);
    this.published('newTodoText', '');
    this.published('filter', 'all'); // 'all', 'active', 'completed'
  }

  /**
   * Get filtered todos based on current filter
   */
  get filteredTodos() {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.isCompleted);
      case 'completed':
        return this.todos.filter(t => t.isCompleted);
      default:
        return this.todos;
    }
  }

  /**
   * Get count of active (incomplete) todos
   */
  get activeCount() {
    return this.todos.filter(t => !t.isCompleted).length;
  }

  /**
   * Add a new todo
   */
  addTodo() {
    const text = this.newTodoText.trim();
    if (text) {
      const todo = new TodoItem(Date.now(), text, false);
      this.todos = [...this.todos, todo];
      this.newTodoText = '';
    }
  }

  /**
   * Toggle a todo's completion status
   */
  toggleTodo(id) {
    this.todos = this.todos.map(todo =>
      todo.id === id
        ? new TodoItem(todo.id, todo.title, !todo.isCompleted)
        : todo
    );
  }

  /**
   * Delete a todo
   */
  deleteTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }

  /**
   * Clear all completed todos
   */
  clearCompleted() {
    this.todos = this.todos.filter(todo => !todo.isCompleted);
  }

  /**
   * Set the filter
   */
  setFilter(filter) {
    this.filter = filter;
  }
}

// =============================================================================
// View
// =============================================================================

/**
 * Create the Todo App view
 */
function TodoAppView(viewModel) {
  const app = App(() =>
    VStack({ alignment: 'leading', spacing: 0 },
      // Header
      Text('My Todos')
        .font(Font.largeTitle)
        .foregroundColor(Color.primary)
        .padding({ bottom: 20 }),

      // Input Row
      HStack({ spacing: 12 },
        TextField('What needs to be done?', viewModel.binding('newTodoText'))
          .textFieldStyle('roundedBorder')
          .padding({ vertical: 12, horizontal: 16 }),

        Button('Add', () => viewModel.addTodo())
          .padding({ vertical: 12, horizontal: 20 })
          .background(Color.blue)
          .foregroundColor('white')
          .cornerRadius(8)
      )
      .padding({ bottom: 16 }),

      // Filter Buttons
      HStack({ spacing: 8 },
        FilterButton('All', 'all', viewModel),
        FilterButton('Active', 'active', viewModel),
        FilterButton('Completed', 'completed', viewModel),
        Spacer(),
        Text(`${viewModel.activeCount} items left`)
          .font(Font.caption)
          .foregroundColor(Color.gray)
      )
      .padding({ bottom: 16 }),

      // Todo List
      VStack({ alignment: 'leading', spacing: 8 },
        ForEach(viewModel.filteredTodos, { id: 'id' }, (todo) =>
          TodoItemRow(todo, viewModel)
        )
      ),

      // Empty State
      viewModel.filteredTodos.length === 0
        ? Text(viewModel.filter === 'all' ? 'No todos yet. Add one above!' : `No ${viewModel.filter} todos.`)
            .font(Font.body)
            .foregroundColor(Color.gray)
            .padding({ vertical: 40 })
        : null,

      // Footer
      viewModel.todos.some(t => t.isCompleted)
        ? Button('Clear Completed', () => viewModel.clearCompleted())
            .foregroundColor(Color.red)
            .padding({ top: 16 })
        : null
    )
    .padding(20)
  );

  return app;
}

/**
 * Filter button component
 */
function FilterButton(label, filterValue, viewModel) {
  const isActive = viewModel.filter === filterValue;

  return Button(label, () => viewModel.setFilter(filterValue))
    .padding({ vertical: 8, horizontal: 12 })
    .background(isActive ? Color.blue : Color.gray.opacity(0.1))
    .foregroundColor(isActive ? 'white' : Color.primary.rgba())
    .cornerRadius(6);
}

/**
 * Single todo item row
 */
function TodoItemRow(todo, viewModel) {
  return HStack({ spacing: 12 },
    // Checkbox
    Button(todo.isCompleted ? '✓' : '○', () => viewModel.toggleTodo(todo.id))
      .foregroundColor(todo.isCompleted ? Color.green.rgba() : Color.gray.rgba())
      .font(Font.title2),

    // Title
    Text(todo.title)
      .font(Font.body)
      .foregroundColor(todo.isCompleted ? Color.gray : Color.primary)
      .strikethrough(todo.isCompleted),

    Spacer(),

    // Delete button
    Button('×', () => viewModel.deleteTodo(todo.id))
      .foregroundColor(Color.red.rgba())
      .font(Font.title2)
      .opacity(0.6)
  )
  .padding({ vertical: 12, horizontal: 16 })
  .background(Color.secondarySystemBackground.rgba())
  .cornerRadius(8);
}

// =============================================================================
// App Initialization
// =============================================================================

// Create ViewModel
const viewModel = new TodoViewModel();

// Add some sample todos
viewModel.todos = [
  new TodoItem(1, 'Learn SwiftUI for Web'),
  new TodoItem(2, 'Build a todo app', true),
  new TodoItem(3, 'Share with the community')
];

// Create and mount the app
const app = TodoAppView(viewModel);
app.mount('#root');

// Debounced refresh to prevent excessive re-renders during typing
let refreshPending = false;
function debouncedRefresh() {
  if (refreshPending) return;
  refreshPending = true;
  requestAnimationFrame(() => {
    refreshPending = false;
    app.refresh();
  });
}

// Re-render when ViewModel changes
viewModel.subscribe(() => {
  debouncedRefresh();
});

// Log for debugging
console.log('Todo App initialized with', viewModel.todos.length, 'todos');
