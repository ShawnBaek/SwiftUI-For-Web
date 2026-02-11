/**
 * Button Tests
 * Tests for the Button control component (descriptor-based API)
 */

import { describe, it, expect } from '../../TestUtils.js';
import { Button } from '../../../src/View/Control/Button.js';
import { Text } from '../../../src/View/Text.js';
import { HStack } from '../../../src/Layout/Stack/HStack.js';
import { render } from '../../../src/Core/Renderer.js';

describe('Button', () => {
  describe('Factory Function', () => {
    it('should create a descriptor with type Button', () => {
      const button = Button('Click', () => {});
      expect(button.type).toBe('Button');
    });

    it('should be a frozen object', () => {
      const button = Button('Click', () => {});
      expect(Object.isFrozen(button)).toBeTruthy();
    });
  });

  describe('Constructor - String Label', () => {
    it('should accept string label and action', () => {
      const action = () => {};
      const button = Button('Click Me', action);
      expect(button.props.label).toBe('Click Me');
      expect(button.props.action).toBe(action);
    });

    it('should default action to a function', () => {
      const button = Button('Click');
      expect(typeof button.props.action).toBe('function');
    });
  });

  describe('Constructor - SwiftUI Style (action, label)', () => {
    it('should accept action first, then label view', () => {
      const action = () => {};
      const label = Text('Label');
      const button = Button(action, label);
      expect(button.props.action).toBe(action);
      expect(button.children).toHaveLength(1);
    });

    it('should accept action first, then string label', () => {
      const action = () => {};
      const button = Button(action, 'Label');
      expect(button.props.action).toBe(action);
      expect(button.props.label).toBe('Label');
    });
  });

  describe('render()', () => {
    it('should create a button element', () => {
      const button = Button('Click', () => {});
      const element = render(button);
      expect(element.tagName).toBe('BUTTON');
    });

    it('should set text content for string label', () => {
      const button = Button('Click Me', () => {});
      const element = render(button);
      expect(element.textContent).toBe('Click Me');
    });

    it('should render label view inside button', () => {
      const button = Button(() => {}, Text('Custom'));
      const element = render(button);
      expect(element.querySelector('span')).toBeTruthy();
    });

    it('should set cursor to pointer', () => {
      const button = Button('Click', () => {});
      const element = render(button);
      expect(element.style.cursor).toBe('pointer');
    });
  });

  describe('Action Handler', () => {
    it('should call action when clicked', () => {
      let clicked = false;
      const button = Button('Click', () => { clicked = true; });
      const element = render(button);

      // Event delegation requires element to be in DOM
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      expect(clicked).toBe(true);
    });

    it('should not call action when disabled', () => {
      let clicked = false;
      const button = Button('Click', () => { clicked = true; }).disabled();
      const element = render(button);

      element.click();

      expect(clicked).toBe(false);
    });
  });

  describe('disabled()', () => {
    it('should disable the button', () => {
      const button = Button('Click', () => {}).disabled();
      const element = render(button);
      expect(element.disabled).toBe(true);
    });

    it('should set cursor to not-allowed', () => {
      const button = Button('Click', () => {}).disabled();
      const element = render(button);
      expect(element.style.cursor).toBe('not-allowed');
    });

    it('should reduce opacity', () => {
      const button = Button('Click', () => {}).disabled();
      const element = render(button);
      expect(element.style.opacity).toBe('0.5');
    });

    it('should accept false to enable', () => {
      const button = Button('Click', () => {}).disabled(false);
      const element = render(button);
      expect(element.disabled).toBe(false);
    });

    it('should return a new descriptor (immutable)', () => {
      const button = Button('Click', () => {});
      const disabled = button.disabled();
      expect(disabled).not.toBe(button);
      expect(disabled.type).toBe('Button');
    });
  });

  describe('buttonStyle()', () => {
    it('should apply bordered style', () => {
      const button = Button('Click', () => {}).buttonStyle('bordered');
      const element = render(button);
      expect(element.style.border).toContain('solid');
    });

    it('should apply borderedProminent style', () => {
      const button = Button('Click', () => {}).buttonStyle('borderedProminent');
      const element = render(button);
      // Browser normalizes rgba(0, 122, 255, 1) to rgb(0, 122, 255)
      expect(element.style.background).toContain('0, 122, 255');
      expect(element.style.color).toBe('white');
    });

    it('should apply borderless style', () => {
      const button = Button('Click', () => {}).buttonStyle('borderless');
      const element = render(button);
      expect(element.style.background).toBe('transparent');
    });

    it('should return a new descriptor (immutable)', () => {
      const button = Button('Click', () => {});
      const styled = button.buttonStyle('bordered');
      expect(styled).not.toBe(button);
    });
  });

  describe('Modifier Chaining', () => {
    it('should support padding modifier', () => {
      const button = Button('Click', () => {}).padding(20);
      const element = render(button);
      expect(element.style.padding).toBe('20px');
    });

    it('should support background modifier', () => {
      const button = Button('Click', () => {}).background('red');
      const element = render(button);
      expect(element.style.backgroundColor).toBe('red');
    });

    it('should support foregroundColor modifier', () => {
      const button = Button('Click', () => {}).foregroundColor('white');
      const element = render(button);
      expect(element.style.color).toBe('white');
    });

    it('should support cornerRadius modifier', () => {
      const button = Button('Click', () => {}).cornerRadius(8);
      const element = render(button);
      expect(element.style.borderRadius).toBe('8px');
    });

    it('should support chaining multiple modifiers', () => {
      const button = Button('Click', () => {})
        .padding(16)
        .background('blue')
        .foregroundColor('white')
        .cornerRadius(8);
      const element = render(button);

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
      const element = render(button);
      // HStack renders as a flex-row div
      const flexRow = element.querySelector('div');
      expect(flexRow).toBeTruthy();
      expect(flexRow.style.flexDirection).toBe('row');
    });
  });
});
