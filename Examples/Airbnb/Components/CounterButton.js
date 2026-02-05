/**
 * CounterButton Component - Stepper control for filter values
 */

import SwiftUI from '../../../src/index.js';
const { HStack, Button, Text, Font, Color } = SwiftUI;

import vm from '../ViewModels/AppViewModel.js';

export function CounterButton(property) {
  const value = vm[property];

  return HStack({ spacing: 12 },
    Button(
      Text('−')
        .font(Font.system(20))
        .foregroundColor(value > 0 ? Color.hex('#222222') : Color.hex('#DDDDDD')),
      () => {
        if (value > 0) vm[property] = value - 1;
      }
    )
    .frame({ width: 32, height: 32 })
    .modifier({
      apply(el) {
        el.style.background = 'white';
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '50%';
        el.style.cursor = value > 0 ? 'pointer' : 'not-allowed';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
      }
    }),
    Text(value === 0 ? 'Any' : String(value))
      .font(Font.system(16))
      .frame({ width: 32 })
      .modifier({
        apply(el) {
          el.style.textAlign = 'center';
        }
      }),
    Button(
      Text('+')
        .font(Font.system(20))
        .foregroundColor(Color.hex('#222222')),
      () => { vm[property] = value + 1; }
    )
    .frame({ width: 32, height: 32 })
    .modifier({
      apply(el) {
        el.style.background = 'white';
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
      }
    })
  );
}

export default CounterButton;
