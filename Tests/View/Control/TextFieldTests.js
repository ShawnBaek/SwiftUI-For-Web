/**
 * TextField Tests
 * Tests for the TextField and SecureField control components
 */

import { describe, it, expect } from '../../TestUtils.js';
import { TextField, TextFieldView, SecureField, SecureFieldView } from '../../../src/View/Control/TextField.js';
import { View } from '../../../src/Core/View.js';
import { Binding } from '../../../src/Data/Binding.js';
import { State } from '../../../src/Data/State.js';

describe('TextField', () => {
  describe('Factory Function', () => {
    it('should create a TextFieldView instance', () => {
      const field = TextField('Placeholder');
      expect(field).toBeInstanceOf(TextFieldView);
    });

    it('should create a View instance', () => {
      const field = TextField('Placeholder');
      expect(field).toBeInstanceOf(View);
    });
  });

  describe('Constructor - String Placeholder', () => {
    it('should accept string placeholder', () => {
      const field = TextField('Enter name');
      expect(field._placeholder).toBe('Enter name');
    });

    it('should accept placeholder and binding', () => {
      const state = new State('');
      const field = TextField('Enter name', state.binding);
      expect(field._placeholder).toBe('Enter name');
      expect(field._text).toBeInstanceOf(Binding);
    });

    it('should accept placeholder, binding, and onEditingChanged', () => {
      const state = new State('');
      const callback = () => {};
      const field = TextField('Enter name', state.binding, callback);
      expect(field._onEditingChanged).toBe(callback);
    });
  });

  describe('Constructor - Options Object', () => {
    it('should accept options object', () => {
      const state = new State('');
      const field = TextField({
        placeholder: 'Enter text',
        text: state.binding
      });
      expect(field._placeholder).toBe('Enter text');
    });

    it('should accept onEditingChanged in options', () => {
      const callback = () => {};
      const field = TextField({
        placeholder: 'Enter text',
        onEditingChanged: callback
      });
      expect(field._onEditingChanged).toBe(callback);
    });

    it('should accept onCommit in options', () => {
      const callback = () => {};
      const field = TextField({
        placeholder: 'Enter text',
        onCommit: callback
      });
      expect(field._onCommit).toBe(callback);
    });
  });

  describe('_render()', () => {
    it('should create an input element', () => {
      const field = TextField('Placeholder');
      const element = field._render();
      expect(element.tagName).toBe('INPUT');
    });

    it('should set type to text by default', () => {
      const field = TextField('Placeholder');
      const element = field._render();
      expect(element.type).toBe('text');
    });

    it('should set data-view to TextField', () => {
      const field = TextField('Placeholder');
      const element = field._render();
      expect(element.dataset.view).toBe('TextField');
    });

    it('should set placeholder attribute', () => {
      const field = TextField('Enter your name');
      const element = field._render();
      expect(element.placeholder).toBe('Enter your name');
    });

    it('should set initial value from binding', () => {
      const state = new State('Hello');
      const field = TextField('Placeholder', state.binding);
      const element = field._render();
      expect(element.value).toBe('Hello');
    });
  });

  describe('Two-Way Binding', () => {
    it('should update binding when input changes', () => {
      const state = new State('');
      const field = TextField('Placeholder', state.binding);
      const element = field._render();

      // Simulate input
      element.value = 'New Value';
      element.dispatchEvent(new Event('input'));

      expect(state.value).toBe('New Value');
    });
  });

  describe('disabled()', () => {
    it('should disable the input', () => {
      const field = TextField('Placeholder').disabled();
      const element = field._render();
      expect(element.disabled).toBe(true);
    });

    it('should set opacity to 0.5 when disabled', () => {
      const field = TextField('Placeholder').disabled();
      const element = field._render();
      expect(element.style.opacity).toBe('0.5');
    });

    it('should set cursor to not-allowed when disabled', () => {
      const field = TextField('Placeholder').disabled();
      const element = field._render();
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should accept false to enable', () => {
      const field = TextField('Placeholder').disabled(false);
      const element = field._render();
      expect(element.disabled).toBe(false);
    });

    it('should return this for chaining', () => {
      const field = TextField('Placeholder');
      expect(field.disabled()).toBe(field);
    });
  });

  describe('textFieldStyle()', () => {
    it('should apply default style', () => {
      const field = TextField('Placeholder').textFieldStyle('default');
      const element = field._render();
      expect(element.style.borderRadius).toBe('4px');
    });

    it('should apply roundedBorder style', () => {
      const field = TextField('Placeholder').textFieldStyle('roundedBorder');
      const element = field._render();
      expect(element.style.borderRadius).toBe('6px');
    });

    it('should apply plain style', () => {
      const field = TextField('Placeholder').textFieldStyle('plain');
      const element = field._render();
      expect(element.style.border).toBe('none');
    });

    it('should return this for chaining', () => {
      const field = TextField('Placeholder');
      expect(field.textFieldStyle('roundedBorder')).toBe(field);
    });
  });

  describe('keyboardType()', () => {
    it('should set input type to email', () => {
      const field = TextField('Email').keyboardType('email');
      const element = field._render();
      expect(element.type).toBe('email');
    });

    it('should set input type to number', () => {
      const field = TextField('Number').keyboardType('number');
      const element = field._render();
      expect(element.type).toBe('number');
    });

    it('should set input type to tel for phone', () => {
      const field = TextField('Phone').keyboardType('phone');
      const element = field._render();
      expect(element.type).toBe('tel');
    });

    it('should set input type to url', () => {
      const field = TextField('URL').keyboardType('url');
      const element = field._render();
      expect(element.type).toBe('url');
    });

    it('should return this for chaining', () => {
      const field = TextField('Placeholder');
      expect(field.keyboardType('email')).toBe(field);
    });
  });

  describe('autocapitalization()', () => {
    it('should set autocapitalize to none', () => {
      const field = TextField('Text').autocapitalization('none');
      const element = field._render();
      expect(element.autocapitalize).toBe('none');
    });

    it('should set autocapitalize to words', () => {
      const field = TextField('Text').autocapitalization('words');
      const element = field._render();
      expect(element.autocapitalize).toBe('words');
    });

    it('should return this for chaining', () => {
      const field = TextField('Placeholder');
      expect(field.autocapitalization('none')).toBe(field);
    });
  });

  describe('disableAutocorrection()', () => {
    it('should disable autocorrection', () => {
      const field = TextField('Text').disableAutocorrection();
      const element = field._render();
      expect(element.autocomplete).toBe('off');
    });

    it('should set spellcheck to false', () => {
      const field = TextField('Text').disableAutocorrection();
      const element = field._render();
      expect(element.getAttribute('spellcheck')).toBe('false');
    });

    it('should return this for chaining', () => {
      const field = TextField('Placeholder');
      expect(field.disableAutocorrection()).toBe(field);
    });
  });

  describe('onCommit()', () => {
    it('should set onCommit callback', () => {
      const callback = () => {};
      const field = TextField('Placeholder').onCommit(callback);
      expect(field._onCommit).toBe(callback);
    });

    it('should return this for chaining', () => {
      const field = TextField('Placeholder');
      expect(field.onCommit(() => {})).toBe(field);
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const field = TextField('Placeholder').padding(20);
      const element = field._render();
      expect(element.style.padding).toBe('20px');
    });

    it('should support background modifier', () => {
      const field = TextField('Placeholder').background('lightgray');
      const element = field._render();
      expect(element.style.backgroundColor).toBe('lightgray');
    });

    it('should support chaining multiple modifiers', () => {
      const field = TextField('Placeholder')
        .textFieldStyle('roundedBorder')
        .disabled()
        .padding(10);
      const element = field._render();

      expect(element.style.borderRadius).toBe('6px');
      expect(element.disabled).toBe(true);
      expect(element.style.padding).toBe('10px');
    });
  });
});

describe('SecureField', () => {
  describe('Factory Function', () => {
    it('should create a SecureFieldView instance', () => {
      const field = SecureField('Password');
      expect(field).toBeInstanceOf(SecureFieldView);
    });

    it('should create a TextFieldView instance', () => {
      const field = SecureField('Password');
      expect(field).toBeInstanceOf(TextFieldView);
    });
  });

  describe('_render()', () => {
    it('should create input with type password', () => {
      const field = SecureField('Password');
      const element = field._render();
      expect(element.type).toBe('password');
    });

    it('should set data-view to TextField', () => {
      const field = SecureField('Password');
      const element = field._render();
      expect(element.dataset.view).toBe('TextField');
    });
  });

  describe('Binding', () => {
    it('should bind to state', () => {
      const state = new State('secret');
      const field = SecureField('Password', state.binding);
      const element = field._render();
      expect(element.value).toBe('secret');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running TextField tests...');
}
