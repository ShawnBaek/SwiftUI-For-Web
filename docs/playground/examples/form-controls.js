// Form controls: every control writes a State through its binding.
import {
  App, Form, Section, Text, TextField, Toggle, Slider, Stepper, Picker, PickerStyle,
  State, Color
} from 'swiftui-for-web';

const name = new State('Taylor');
const notifications = new State(true);
const volume = new State(40);
const guests = new State(2);
const flavor = new State('vanilla');

const SettingsView = () =>
  Form(
    Section({ header: 'Profile' },
      TextField('Name', name.binding),
      Toggle('Notifications', notifications.binding)
    ),
    Section({ header: 'Preferences' },
      Slider(volume.binding, { in: [0, 100], step: 1 }),
      Text(() => `Volume: ${volume.value}`),
      Stepper(Text(() => `Guests: ${guests.value}`), guests.binding, { in: [1, 8] }),
      Picker('Flavor', flavor.binding,
        Text('Vanilla').tag('vanilla'),
        Text('Chocolate').tag('chocolate'),
        Text('Strawberry').tag('strawberry')
      ).pickerStyle(PickerStyle.segmented)
    ),
    Section({ header: 'Summary' },
      Text(() => `${name.value || 'Someone'} wants ${flavor.value} for ${guests.value}, `
        + `notifications ${notifications.value ? 'on' : 'off'}.`)
        .foregroundColor(Color.secondary)
    )
  );

App(SettingsView).mount('#root');
