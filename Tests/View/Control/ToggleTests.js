/**
 * Toggle Tests
 * Tests for the Toggle control component
 */

import { describe, it, expect } from '../../TestUtils.js';
import { Toggle, ToggleView } from '../../../src/View/Control/Toggle.js';
import { View } from '../../../src/Core/View.js';
import { Binding } from '../../../src/Data/Binding.js';
import { State } from '../../../src/Data/State.js';

describe('Toggle', () => {
  describe('Factory Function', () => {
    it('should create a ToggleView instance', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle).toBeInstanceOf(ToggleView);
    });

    it('should create a View instance', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle).toBeInstanceOf(View);
    });
  });

  describe('Constructor - Binding Only', () => {
    it('should accept binding only', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle._isOn).toBeInstanceOf(Binding);
      expect(toggle._label).toBeNull();
    });
  });

  describe('Constructor - Label and Binding', () => {
    it('should accept string label and binding', () => {
      const state = new State(false);
      const toggle = Toggle('Enable notifications', state.binding);
      expect(toggle._label).toBe('Enable notifications');
      expect(toggle._isOn).toBeInstanceOf(Binding);
    });
  });

  describe('Constructor - Options Object', () => {
    it('should accept options object', () => {
      const state = new State(true);
      const toggle = Toggle({
        label: 'Dark Mode',
        isOn: state.binding
      });
      expect(toggle._label).toBe('Dark Mode');
      expect(toggle._isOn.value).toBe(true);
    });
  });

  describe('Constructor - View Label', () => {
    it('should accept View as label', () => {
      const state = new State(false);
      // Toggle checks `instanceof View`, so we need a real View instance
      const labelView = new View();
      const toggle = Toggle(labelView, state.binding);
      expect(toggle._labelView).toBe(labelView);
    });
  });

  describe('_render() - Switch Style', () => {
    it('should render a div container', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = toggle._render();
      expect(element.tagName).toBe('DIV');
    });

    it('should set data-view to Toggle', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = toggle._render();
      expect(element.dataset.view).toBe('Toggle');
    });

    it('should set cursor to pointer', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = toggle._render();
      expect(element.style.cursor).toBe('pointer');
    });

    it('should render label text', () => {
      const state = new State(false);
      const toggle = Toggle('My Label', state.binding);
      const element = toggle._render();
      expect(element.textContent).toContain('My Label');
    });
  });

  describe('_render() - Checkbox Style', () => {
    it('should render a label element', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = toggle._render();
      expect(element.tagName).toBe('LABEL');
    });

    it('should contain a checkbox input', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = toggle._render();
      const checkbox = element.children[0];
      expect(checkbox.tagName).toBe('INPUT');
      expect(checkbox.type).toBe('checkbox');
    });

    it('should reflect initial state', () => {
      const state = new State(true);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = toggle._render();
      const checkbox = element.children[0];
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('_render() - Button Style', () => {
    it('should render a button element', () => {
      const state = new State(false);
      const toggle = Toggle('Toggle', state.binding).toggleStyle('button');
      const element = toggle._render();
      expect(element.tagName).toBe('BUTTON');
    });

    it('should show label as button text', () => {
      const state = new State(false);
      const toggle = Toggle('Click Me', state.binding).toggleStyle('button');
      const element = toggle._render();
      expect(element.textContent).toBe('Click Me');
    });
  });

  describe('Two-Way Binding', () => {
    it('should update binding when toggled (switch)', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = toggle._render();

      element.click();

      expect(state.value).toBe(true);
    });

    it('should toggle back to false', () => {
      const state = new State(true);
      const toggle = Toggle(state.binding);
      const element = toggle._render();

      element.click();

      expect(state.value).toBe(false);
    });

    it('should update binding when checkbox changes', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = toggle._render();
      const checkbox = element.children[0];

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(state.value).toBe(true);
    });

    it('should update binding when button clicked', () => {
      const state = new State(false);
      const toggle = Toggle('Toggle', state.binding).toggleStyle('button');
      const element = toggle._render();

      element.click();

      expect(state.value).toBe(true);
    });
  });

  describe('disabled()', () => {
    it('should set cursor to not-allowed', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled();
      const element = toggle._render();
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should set opacity to 0.5', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled();
      const element = toggle._render();
      expect(element.style.opacity).toBe('0.5');
    });

    it('should not toggle when disabled', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled();
      const element = toggle._render();

      element.click();

      expect(state.value).toBe(false);
    });

    it('should disable checkbox input', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox').disabled();
      const element = toggle._render();
      const checkbox = element.children[0];
      expect(checkbox.disabled).toBe(true);
    });

    it('should disable button', () => {
      const state = new State(false);
      const toggle = Toggle('Toggle', state.binding).toggleStyle('button').disabled();
      const element = toggle._render();
      expect(element.disabled).toBe(true);
    });

    it('should accept false to enable', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled(false);
      const element = toggle._render();
      expect(element.style.cursor).toBe('pointer');
    });

    it('should return this for chaining', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle.disabled()).toBe(toggle);
    });
  });

  describe('toggleStyle()', () => {
    it('should default to switch style', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle._style).toBe('switch');
    });

    it('should set checkbox style', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      expect(toggle._style).toBe('checkbox');
    });

    it('should set button style', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('button');
      expect(toggle._style).toBe('button');
    });

    it('should return this for chaining', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle.toggleStyle('checkbox')).toBe(toggle);
    });
  });

  describe('tint()', () => {
    it('should set tint color', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).tint('purple');
      expect(toggle._tint).toBe('purple');
    });

    it('should return this for chaining', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(toggle.tint('blue')).toBe(toggle);
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).padding(20);
      const element = toggle._render();
      expect(element.style.padding).toBe('20px');
    });

    it('should support chaining multiple modifiers', () => {
      const state = new State(false);
      const toggle = Toggle('Label', state.binding)
        .toggleStyle('checkbox')
        .disabled()
        .padding(10);
      const element = toggle._render();

      expect(element.style.opacity).toBe('0.5');
      expect(element.style.padding).toBe('10px');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running Toggle tests...');
}
