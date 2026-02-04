/**
 * Button Tests
 * Tests for the Button control component
 */

import { describe, it, expect } from '../../TestUtils.js';
import { Button, ButtonView } from '../../../src/View/Control/Button.js';
import { View } from '../../../src/Core/View.js';
import { Text } from '../../../src/View/Text.js';
import { HStack } from '../../../src/Layout/Stack/HStack.js';

describe('Button', () => {
  describe('Factory Function', () => {
    it('should create a ButtonView instance', () => {
      const button = Button('Click', () => {});
      expect(button).toBeInstanceOf(ButtonView);
    });

    it('should create a View instance', () => {
      const button = Button('Click', () => {});
      expect(button).toBeInstanceOf(View);
    });
  });

  describe('Constructor - String Label', () => {
    it('should accept string label and action', () => {
      const action = () => {};
      const button = Button('Click Me', action);
      expect(button._label).toBe('Click Me');
      expect(button._action).toBe(action);
    });

    it('should default action to empty function', () => {
      const button = Button('Click');
      expect(typeof button._action).toBe('function');
    });
  });

  describe('Constructor - SwiftUI Style (action, label)', () => {
    it('should accept action first, then label view', () => {
      const action = () => {};
      const label = Text('Label');
      const button = Button(action, label);
      expect(button._action).toBe(action);
      expect(button._labelView).toBe(label);
    });

    it('should accept action first, then string label', () => {
      const action = () => {};
      const button = Button(action, 'Label');
      expect(button._action).toBe(action);
      expect(button._label).toBe('Label');
    });
  });

  describe('Constructor - View Label', () => {
    it('should accept view as label', () => {
      const label = Text('Custom');
      const action = () => {};
      const button = Button(label, action);
      expect(button._labelView).toBe(label);
    });
  });

  describe('_render()', () => {
    it('should create a button element', () => {
      const button = Button('Click', () => {});
      const element = button._render();
      expect(element.tagName).toBe('BUTTON');
    });

    it('should set data-view to Button', () => {
      const button = Button('Click', () => {});
      const element = button._render();
      expect(element.dataset.view).toBe('Button');
    });

    it('should set text content for string label', () => {
      const button = Button('Click Me', () => {});
      const element = button._render();
      expect(element.textContent).toBe('Click Me');
    });

    it('should render label view inside button', () => {
      const button = Button(() => {}, Text('Custom'));
      const element = button._render();
      expect(element.querySelector('span')).toBeTruthy();
    });

    it('should set cursor to pointer', () => {
      const button = Button('Click', () => {});
      const element = button._render();
      expect(element.style.cursor).toBe('pointer');
    });
  });

  describe('Action Handler', () => {
    it('should call action when clicked', () => {
      let clicked = false;
      const button = Button('Click', () => { clicked = true; });
      const element = button._render();

      element.click();

      expect(clicked).toBe(true);
    });

    it('should not call action when disabled', () => {
      let clicked = false;
      const button = Button('Click', () => { clicked = true; }).disabled();
      const element = button._render();

      element.click();

      expect(clicked).toBe(false);
    });
  });

  describe('disabled()', () => {
    it('should disable the button', () => {
      const button = Button('Click', () => {}).disabled();
      const element = button._render();
      expect(element.disabled).toBe(true);
    });

    it('should set cursor to not-allowed', () => {
      const button = Button('Click', () => {}).disabled();
      const element = button._render();
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should reduce opacity', () => {
      const button = Button('Click', () => {}).disabled();
      const element = button._render();
      expect(element.style.opacity).toBe('0.5');
    });

    it('should accept false to enable', () => {
      const button = Button('Click', () => {}).disabled(false);
      const element = button._render();
      expect(element.disabled).toBe(false);
    });

    it('should return this for chaining', () => {
      const button = Button('Click', () => {});
      expect(button.disabled()).toBe(button);
    });
  });

  describe('buttonStyle()', () => {
    it('should apply bordered style', () => {
      const button = Button('Click', () => {}).buttonStyle('bordered');
      const element = button._render();
      expect(element.style.border).toContain('solid');
    });

    it('should apply borderedProminent style', () => {
      const button = Button('Click', () => {}).buttonStyle('borderedProminent');
      const element = button._render();
      expect(element.style.background).toContain('rgba(0, 122, 255');
      expect(element.style.color).toBe('white');
    });

    it('should apply borderless style', () => {
      const button = Button('Click', () => {}).buttonStyle('borderless');
      const element = button._render();
      expect(element.style.background).toBe('transparent');
    });

    it('should return this for chaining', () => {
      const button = Button('Click', () => {});
      expect(button.buttonStyle('bordered')).toBe(button);
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const button = Button('Click', () => {}).padding(20);
      const element = button._render();
      expect(element.style.padding).toBe('20px');
    });

    it('should support background modifier', () => {
      const button = Button('Click', () => {}).background('red');
      const element = button._render();
      expect(element.style.backgroundColor).toBe('red');
    });

    it('should support foregroundColor modifier', () => {
      const button = Button('Click', () => {}).foregroundColor('white');
      const element = button._render();
      expect(element.style.color).toBe('white');
    });

    it('should support cornerRadius modifier', () => {
      const button = Button('Click', () => {}).cornerRadius(8);
      const element = button._render();
      expect(element.style.borderRadius).toBe('8px');
    });

    it('should support chaining multiple modifiers', () => {
      const button = Button('Click', () => {})
        .padding(16)
        .background('blue')
        .foregroundColor('white')
        .cornerRadius(8);
      const element = button._render();

      expect(element.style.padding).toBe('16px');
      expect(element.style.backgroundColor).toBe('blue');
      expect(element.style.color).toBe('white');
      expect(element.style.borderRadius).toBe('8px');
    });
  });

  describe('Complex Label', () => {
    it('should render HStack as label', () => {
      const button = Button(() => {},
        HStack(
          Text('Icon'),
          Text('Label')
        )
      );
      const element = button._render();
      expect(element.querySelector('[data-view="HStack"]')).toBeTruthy();
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running Button tests...');
}
