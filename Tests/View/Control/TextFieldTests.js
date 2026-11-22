/**
 * TextField Tests
 * Tests for the TextField and SecureField control components
 */

import { describe, it, expect } from '../../TestUtils.js';
import { TextField, SecureField } from '../../../src/View/Control/TextField.js';
import { render } from '../../../src/Core/Renderer.js';
import { isDescriptor } from '../../../src/Core/ViewDescriptor.js';
import { State } from '../../../src/Data/State.js';

describe('TextField', () => {
  // #48: TextField returns a view descriptor; these tests render it and
  // assert on the DOM.
  describe('Factory Function', () => {
    it('should return a TextField descriptor', () => {
      const field = TextField('Placeholder');
      expect(isDescriptor(field)).toBe(true);
      expect(field.type).toBe('TextField');
    });
  });

  describe('String Placeholder', () => {
    it('should accept string placeholder', () => {
      expect(render(TextField('Enter name')).placeholder).toBe('Enter name');
    });

    it('should accept placeholder and binding', () => {
      const state = new State('Ada');
      const element = render(TextField('Enter name', state.binding));
      expect(element.placeholder).toBe('Enter name');
      expect(element.value).toBe('Ada');
    });

    it('should call onEditingChanged on focus and blur', () => {
      const state = new State('');
      const calls = [];
      const element = render(TextField('Enter name', state.binding, (editing) => calls.push(editing)));
      element.dispatchEvent(new Event('focus'));
      element.dispatchEvent(new Event('blur'));
      expect(calls).toEqual([true, false]);
    });
  });

  describe('Options Object', () => {
    it('should accept options object', () => {
      const state = new State('');
      const element = render(TextField({ placeholder: 'Enter text', text: state.binding }));
      expect(element.placeholder).toBe('Enter text');
    });

    it('should accept onEditingChanged in options', () => {
      const calls = [];
      const element = render(TextField({ placeholder: 'Enter text', onEditingChanged: (e) => calls.push(e) }));
      element.dispatchEvent(new Event('focus'));
      expect(calls).toEqual([true]);
    });

    it('should accept onCommit in options', () => {
      let committed = 0;
      const element = render(TextField({ placeholder: 'Enter text', onCommit: () => committed++ }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(committed).toBe(1);
    });
  });

  describe('render()', () => {
    it('should create an input element', () => {
      const field = TextField('Placeholder');
      const element = render(field);
      expect(element.tagName).toBe('INPUT');
    });

    it('should set type to text by default', () => {
      const field = TextField('Placeholder');
      const element = render(field);
      expect(element.type).toBe('text');
    });

    it('should set data-view to TextField', () => {
      const field = TextField('Placeholder');
      const element = render(field);
      expect(element.dataset.view).toBe('TextField');
    });

    it('should set placeholder attribute', () => {
      const field = TextField('Enter your name');
      const element = render(field);
      expect(element.placeholder).toBe('Enter your name');
    });

    it('should set initial value from binding', () => {
      const state = new State('Hello');
      const field = TextField('Placeholder', state.binding);
      const element = render(field);
      expect(element.value).toBe('Hello');
    });
  });

  describe('Two-Way Binding', () => {
    it('should update binding when input changes', () => {
      const state = new State('');
      const field = TextField('Placeholder', state.binding);
      const element = render(field);

      // Simulate input
      element.value = 'New Value';
      element.dispatchEvent(new Event('input'));

      expect(state.value).toBe('New Value');
    });
  });

  describe('disabled()', () => {
    it('should disable the input', () => {
      const field = TextField('Placeholder').disabled();
      const element = render(field);
      expect(element.disabled).toBe(true);
    });

    it('should set opacity to 0.5 when disabled', () => {
      const field = TextField('Placeholder').disabled();
      const element = render(field);
      expect(element.style.opacity).toBe('0.5');
    });

    it('should set cursor to not-allowed when disabled', () => {
      const field = TextField('Placeholder').disabled();
      const element = render(field);
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should accept false to enable', () => {
      const field = TextField('Placeholder').disabled(false);
      const element = render(field);
      expect(element.disabled).toBe(false);
    });

    it('returns a new descriptor', () => {
      const field = TextField('Placeholder');
      expect(field.disabled() === field).toBe(false);
    });
  });

  describe('textFieldStyle()', () => {
    it('should apply default style', () => {
      const field = TextField('Placeholder').textFieldStyle('default');
      const element = render(field);
      expect(element.style.borderRadius).toBe('4px');
    });

    it('should apply roundedBorder style', () => {
      const field = TextField('Placeholder').textFieldStyle('roundedBorder');
      const element = render(field);
      expect(element.style.borderRadius).toBe('6px');
    });

    it('should apply plain style', () => {
      const field = TextField('Placeholder').textFieldStyle('plain');
      const element = render(field);
      // Browsers read `border: none` back through the longhand.
      expect(element.style.borderStyle).toBe('none');
    });

    it('returns a new descriptor', () => {
      const field = TextField('Placeholder');
      expect(field.textFieldStyle('roundedBorder') === field).toBe(false);
    });
  });

  describe('keyboardType()', () => {
    it('should set input type to email', () => {
      const field = TextField('Email').keyboardType('email');
      const element = render(field);
      expect(element.type).toBe('email');
    });

    it('should set input type to number', () => {
      const field = TextField('Number').keyboardType('number');
      const element = render(field);
      expect(element.type).toBe('number');
    });

    it('should set input type to tel for phone', () => {
      const field = TextField('Phone').keyboardType('phone');
      const element = render(field);
      expect(element.type).toBe('tel');
    });

    it('should set input type to url', () => {
      const field = TextField('URL').keyboardType('url');
      const element = render(field);
      expect(element.type).toBe('url');
    });

    it('returns a new descriptor', () => {
      const field = TextField('Placeholder');
      expect(field.keyboardType('email') === field).toBe(false);
    });
  });

  describe('autocapitalization()', () => {
    it('should set autocapitalize to none', () => {
      const field = TextField('Text').autocapitalization('none');
      const element = render(field);
      expect(element.autocapitalize).toBe('none');
    });

    it('should set autocapitalize to words', () => {
      const field = TextField('Text').autocapitalization('words');
      const element = render(field);
      expect(element.autocapitalize).toBe('words');
    });

    it('returns a new descriptor', () => {
      const field = TextField('Placeholder');
      expect(field.autocapitalization('none') === field).toBe(false);
    });
  });

  describe('disableAutocorrection()', () => {
    it('should disable autocorrection', () => {
      const field = TextField('Text').disableAutocorrection();
      const element = render(field);
      expect(element.autocomplete).toBe('off');
    });

    it('should set spellcheck to false', () => {
      const field = TextField('Text').disableAutocorrection();
      const element = render(field);
      expect(element.getAttribute('spellcheck')).toBe('false');
    });

    it('returns a new descriptor', () => {
      const field = TextField('Placeholder');
      expect(field.disableAutocorrection() === field).toBe(false);
    });
  });

  describe('onCommit()', () => {
    it('calls the callback when return is pressed', () => {
      let committed = 0;
      const element = render(TextField('Placeholder').onCommit(() => committed++));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(committed).toBe(1);
    });

    it('returns a new descriptor', () => {
      const field = TextField('Placeholder');
      expect(field.onCommit(() => {}) === field).toBe(false);
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const field = TextField('Placeholder').padding(20);
      const element = render(field);
      expect(element.style.padding).toBe('20px');
    });

    it('should support background modifier', () => {
      const field = TextField('Placeholder').background('lightgray');
      const element = render(field);
      expect(element.style.backgroundColor).toBe('lightgray');
    });

    it('should support chaining multiple modifiers', () => {
      const field = TextField('Placeholder')
        .textFieldStyle('roundedBorder')
        .disabled()
        .padding(10);
      const element = render(field);

      expect(element.style.borderRadius).toBe('6px');
      expect(element.disabled).toBe(true);
      expect(element.style.padding).toBe('10px');
    });
  });
});

describe('SecureField', () => {
  describe('Factory Function', () => {
    it('should return a SecureField descriptor', () => {
      expect(SecureField('Password').type).toBe('SecureField');
    });

    it('takes TextField methods', () => {
      const element = render(SecureField('Password').textFieldStyle('roundedBorder').disabled());
      expect(element.type).toBe('password');
      expect(element.style.borderRadius).toBe('6px');
      expect(element.disabled).toBe(true);
    });
  });

  describe('render()', () => {
    it('should create input with type password', () => {
      const field = SecureField('Password');
      const element = render(field);
      expect(element.type).toBe('password');
    });

    it('should set data-view to TextField', () => {
      const field = SecureField('Password');
      const element = render(field);
      expect(element.dataset.view).toBe('TextField');
    });
  });

  describe('Binding', () => {
    it('should bind to state', () => {
      const state = new State('secret');
      const field = SecureField('Password', state.binding);
      const element = render(field);
      expect(element.value).toBe('secret');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running TextField tests...');
}
