/**
 * Toggle Tests
 * Tests for the Toggle control component
 */

import { describe, it, expect } from '../../TestUtils.js';
import { Toggle } from '../../../src/View/Control/Toggle.js';
import { Text } from '../../../src/View/Text.js';
import { render } from '../../../src/Core/Renderer.js';
import { isDescriptor } from '../../../src/Core/ViewDescriptor.js';
import { State } from '../../../src/Data/State.js';

// #48: Toggle returns a view descriptor; these tests render it and assert on
// the DOM.
const track = (element) => element.querySelector('[role="switch"]');

describe('Toggle', () => {
  describe('Factory Function', () => {
    it('should return a Toggle descriptor', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      expect(isDescriptor(toggle)).toBe(true);
      expect(toggle.type).toBe('Toggle');
    });
  });

  describe('Binding Only', () => {
    it('renders an unlabelled switch reflecting the binding', () => {
      const state = new State(false);
      const element = render(Toggle(state.binding));
      expect(element.children.length).toBe(1);
      expect(track(element).getAttribute('aria-checked')).toBe('false');
      expect(track(element).getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('Label and Binding', () => {
    it('labels the switch with the string', () => {
      const state = new State(false);
      const element = render(Toggle('Enable notifications', state.binding));
      const label = element.children[0];
      expect(label.textContent).toBe('Enable notifications');
      expect(track(element).getAttribute('aria-labelledby')).toBe(label.id);
    });
  });

  describe('Options Object', () => {
    it('should accept options object', () => {
      const state = new State(true);
      const element = render(Toggle({ label: 'Dark Mode', isOn: state.binding }));
      expect(element.textContent).toContain('Dark Mode');
      expect(track(element).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('View Label', () => {
    it('should accept a descriptor as label', () => {
      const state = new State(false);
      const element = render(Toggle(Text('Bluetooth'), state.binding));
      const label = element.children[0];
      expect(label.textContent).toBe('Bluetooth');
      expect(track(element).getAttribute('aria-labelledby')).toBe(label.id);
    });
  });

  describe('Switch Style', () => {
    it('should render a div container', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = render(toggle);
      expect(element.tagName).toBe('DIV');
    });

    it('should set data-view to Toggle', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = render(toggle);
      expect(element.dataset.view).toBe('Toggle');
    });

    it('should set cursor to pointer', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = render(toggle);
      expect(element.style.cursor).toBe('pointer');
    });

    it('should render label text', () => {
      const state = new State(false);
      const toggle = Toggle('My Label', state.binding);
      const element = render(toggle);
      expect(element.textContent).toContain('My Label');
    });
  });

  describe('Checkbox Style', () => {
    it('should render a label element', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = render(toggle);
      expect(element.tagName).toBe('LABEL');
    });

    it('should contain a checkbox input', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = render(toggle);
      const checkbox = element.children[0];
      expect(checkbox.tagName).toBe('INPUT');
      expect(checkbox.type).toBe('checkbox');
    });

    it('should reflect initial state', () => {
      const state = new State(true);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = render(toggle);
      const checkbox = element.children[0];
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Button Style', () => {
    it('should render a button element', () => {
      const state = new State(false);
      const toggle = Toggle('Toggle', state.binding).toggleStyle('button');
      const element = render(toggle);
      expect(element.tagName).toBe('BUTTON');
    });

    it('should show label as button text', () => {
      const state = new State(false);
      const toggle = Toggle('Click Me', state.binding).toggleStyle('button');
      const element = render(toggle);
      expect(element.textContent).toBe('Click Me');
    });
  });

  describe('Two-Way Binding', () => {
    it('should update binding when toggled (switch)', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const element = render(toggle);

      element.click();

      expect(state.value).toBe(true);
    });

    it('should toggle back to false', () => {
      const state = new State(true);
      const toggle = Toggle(state.binding);
      const element = render(toggle);

      element.click();

      expect(state.value).toBe(false);
    });

    it('should update binding when checkbox changes', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox');
      const element = render(toggle);
      const checkbox = element.children[0];

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(state.value).toBe(true);
    });

    it('should update binding when button clicked', () => {
      const state = new State(false);
      const toggle = Toggle('Toggle', state.binding).toggleStyle('button');
      const element = render(toggle);

      element.click();

      expect(state.value).toBe(true);
    });
  });

  describe('disabled()', () => {
    it('should set cursor to not-allowed', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled();
      const element = render(toggle);
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should set opacity to 0.5', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled();
      const element = render(toggle);
      expect(element.style.opacity).toBe('0.5');
    });

    it('should not toggle when disabled', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled();
      const element = render(toggle);

      element.click();

      expect(state.value).toBe(false);
    });

    it('should disable checkbox input', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).toggleStyle('checkbox').disabled();
      const element = render(toggle);
      const checkbox = element.children[0];
      expect(checkbox.disabled).toBe(true);
    });

    it('should disable button', () => {
      const state = new State(false);
      const toggle = Toggle('Toggle', state.binding).toggleStyle('button').disabled();
      const element = render(toggle);
      expect(element.disabled).toBe(true);
    });

    it('should accept false to enable', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).disabled(false);
      const element = render(toggle);
      expect(element.style.cursor).toBe('pointer');
    });

    it('returns a new descriptor and leaves the original unchanged', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding);
      const disabled = toggle.disabled();
      expect(disabled === toggle).toBe(false);
      expect(track(render(toggle)).disabled).toBe(false);
      expect(track(render(disabled)).disabled).toBe(true);
    });
  });

  describe('toggleStyle()', () => {
    it('should default to switch style', () => {
      const state = new State(false);
      const element = render(Toggle(state.binding));
      expect(element.tagName).toBe('DIV');
      expect(Boolean(track(element))).toBe(true);
    });

    it('should set checkbox style', () => {
      const state = new State(false);
      expect(render(Toggle(state.binding).toggleStyle('checkbox')).tagName).toBe('LABEL');
    });

    it('should set button style', () => {
      const state = new State(false);
      expect(render(Toggle(state.binding).toggleStyle('button')).tagName).toBe('BUTTON');
    });

    it('applies after a shared modifier', () => {
      const state = new State(false);
      const element = render(Toggle(state.binding).opacity(0.9).toggleStyle('checkbox'));
      expect(element.tagName).toBe('LABEL');
      expect(element.style.opacity).toBe('0.9');
    });
  });

  describe('tint()', () => {
    it('colors the track when on', () => {
      const state = new State(true);
      const element = render(Toggle(state.binding).tint('purple'));
      expect(track(element).style.backgroundColor).toBe('purple');
    });

    it('colors the checkbox accent', () => {
      const state = new State(false);
      const element = render(Toggle(state.binding).toggleStyle('checkbox').tint('purple'));
      expect(element.children[0].style.accentColor).toBe('purple');
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const state = new State(false);
      const toggle = Toggle(state.binding).padding(20);
      const element = render(toggle);
      expect(element.style.padding).toBe('20px');
    });

    it('should support chaining multiple modifiers', () => {
      const state = new State(false);
      const toggle = Toggle('Label', state.binding)
        .toggleStyle('checkbox')
        .disabled()
        .padding(10);
      const element = render(toggle);

      expect(element.style.opacity).toBe('0.5');
      expect(element.style.padding).toBe('10px');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running Toggle tests...');
}
