// Presentations: an alert, a confirmation dialog and a sheet that closes
// itself with `dismiss` from the environment. The binding is the source of
// truth: Escape, the actions and dismiss() all write false.
import {
  App, VStack, Text, Button, State, Environment, EnvironmentValues, Color, Font
} from 'swiftui-for-web';

const showAlert = new State(false);
const showDialog = new State(false);
const showSheet = new State(false);
const status = new State('Nothing yet');

const SheetContent = () => {
  const dismiss = Environment.get(EnvironmentValues.dismiss);
  return VStack({ spacing: 16 },
    Text('A sheet').font(Font.title2),
    Text('Press Escape, or use the button.').foregroundColor(Color.secondary),
    Button('Done', () => dismiss())
  ).padding(24);
};

const ContentView = () =>
  VStack({ spacing: 14 },
    Button('Show alert', () => { showAlert.value = true; }),
    Button('Delete file…', () => { showDialog.value = true; }).foregroundColor(Color.red),
    Button('Show sheet', () => { showSheet.value = true; }),
    Text(() => `Last action: ${status.value}`).foregroundColor(Color.secondary)
  )
  .padding(24)
  .alert('Network unavailable', showAlert.binding, {
    message: 'Check your connection and try again.',
    actions: [
      { title: 'Retry', action: () => { status.value = 'Retry'; } },
      { title: 'Cancel', role: 'cancel', action: () => { status.value = 'Cancelled the alert'; } },
    ],
  })
  .confirmationDialog('Delete this file?', showDialog.binding, {
    titleVisibility: 'visible',
    message: 'You can’t undo this action.',
    actions: [
      Button('Delete', { role: 'destructive' }, () => { status.value = 'Deleted'; }),
      { title: 'Cancel', role: 'cancel' },
    ],
  })
  .sheet(showSheet.binding, {
    onDismiss: () => { status.value = 'Closed the sheet'; },
    content: SheetContent,
  });

App(ContentView).mount('#root');
