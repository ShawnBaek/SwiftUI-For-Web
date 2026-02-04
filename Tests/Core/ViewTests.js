/**
 * View Tests
 * Tests for the base View class
 */

import { describe, it, expect, beforeEach } from '../TestUtils.js';
import { View } from '../../src/Core/View.js';

describe('View', () => {
  describe('constructor', () => {
    it('should initialize with empty modifiers array', () => {
      const view = new View();
      expect(view._modifiers).toEqual([]);
    });

    it('should initialize with null element', () => {
      const view = new View();
      expect(view._element).toBeNull();
    });
  });

  describe('body()', () => {
    it('should return this by default', () => {
      const view = new View();
      expect(view.body()).toBe(view);
    });
  });

  describe('modifier()', () => {
    it('should add modifier to the array', () => {
      const view = new View();
      const mod = { apply: () => {} };
      view.modifier(mod);
      expect(view._modifiers).toHaveLength(1);
      expect(view._modifiers[0]).toBe(mod);
    });

    it('should return this for chaining', () => {
      const view = new View();
      const mod = { apply: () => {} };
      const result = view.modifier(mod);
      expect(result).toBe(view);
    });

    it('should support chaining multiple modifiers', () => {
      const view = new View();
      const mod1 = { apply: () => {} };
      const mod2 = { apply: () => {} };
      const mod3 = { apply: () => {} };

      view.modifier(mod1).modifier(mod2).modifier(mod3);

      expect(view._modifiers).toHaveLength(3);
    });
  });

  describe('_applyModifiers()', () => {
    it('should call apply on each modifier', () => {
      const view = new View();
      const element = document.createElement('div');
      let callCount = 0;

      view.modifier({ apply: () => callCount++ });
      view.modifier({ apply: () => callCount++ });

      view._applyModifiers(element);

      expect(callCount).toBe(2);
    });

    it('should pass element to modifier apply method', () => {
      const view = new View();
      const element = document.createElement('div');
      let receivedElement = null;

      view.modifier({
        apply: (el) => { receivedElement = el; }
      });

      view._applyModifiers(element);

      expect(receivedElement).toBe(element);
    });

    it('should return the element', () => {
      const view = new View();
      const element = document.createElement('div');
      const result = view._applyModifiers(element);
      expect(result).toBe(element);
    });

    it('should skip modifiers without apply method', () => {
      const view = new View();
      const element = document.createElement('div');

      view.modifier(null);
      view.modifier({ notApply: () => {} });
      view.modifier({ apply: (el) => el.classList.add('test') });

      view._applyModifiers(element);

      expect(element.classList.contains('test')).toBeTruthy();
    });
  });

  describe('_render()', () => {
    it('should return an HTMLElement', () => {
      const view = new View();
      const result = view._render();
      expect(result instanceof HTMLElement).toBeTruthy();
    });

    it('should create a div element for base View', () => {
      const view = new View();
      const result = view._render();
      expect(result.tagName).toBe('DIV');
    });

    it('should set data-view attribute to constructor name', () => {
      const view = new View();
      const result = view._render();
      expect(result.dataset.view).toBe('View');
    });

    it('should apply modifiers to the rendered element', () => {
      const view = new View();
      view.modifier({
        apply: (el) => el.classList.add('test-class')
      });

      const result = view._render();

      expect(result.classList.contains('test-class')).toBeTruthy();
    });
  });

  describe('getElement()', () => {
    it('should render and cache the element', () => {
      const view = new View();
      const element = view.getElement();

      expect(element).toBeTruthy();
      expect(view._element).toBe(element);
    });

    it('should return cached element on subsequent calls', () => {
      const view = new View();
      const element1 = view.getElement();
      const element2 = view.getElement();

      expect(element1).toBe(element2);
    });
  });

  describe('rerender()', () => {
    it('should create a new element', () => {
      const view = new View();
      const element1 = view.getElement();
      const element2 = view.rerender();

      expect(element1).not.toBe(element2);
    });

    it('should update cached element', () => {
      const view = new View();
      view.getElement();
      const newElement = view.rerender();

      expect(view._element).toBe(newElement);
    });
  });

  describe('Built-in Modifiers', () => {
    describe('padding()', () => {
      it('should set uniform padding with number', () => {
        const view = new View();
        view.padding(20);
        const element = view._render();

        expect(element.style.padding).toBe('20px');
      });

      it('should set horizontal and vertical padding', () => {
        const view = new View();
        view.padding({ horizontal: 10, vertical: 20 });
        const element = view._render();

        expect(element.style.paddingLeft).toBe('10px');
        expect(element.style.paddingRight).toBe('10px');
        expect(element.style.paddingTop).toBe('20px');
        expect(element.style.paddingBottom).toBe('20px');
      });

      it('should set individual padding values', () => {
        const view = new View();
        view.padding({ top: 1, right: 2, bottom: 3, left: 4 });
        const element = view._render();

        expect(element.style.paddingTop).toBe('1px');
        expect(element.style.paddingRight).toBe('2px');
        expect(element.style.paddingBottom).toBe('3px');
        expect(element.style.paddingLeft).toBe('4px');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.padding(10)).toBe(view);
      });
    });

    describe('frame()', () => {
      it('should set width and height', () => {
        const view = new View();
        view.frame({ width: 100, height: 200 });
        const element = view._render();

        expect(element.style.width).toBe('100px');
        expect(element.style.height).toBe('200px');
      });

      it('should set min/max constraints', () => {
        const view = new View();
        view.frame({ minWidth: 50, maxWidth: 200, minHeight: 100, maxHeight: 400 });
        const element = view._render();

        expect(element.style.minWidth).toBe('50px');
        expect(element.style.maxWidth).toBe('200px');
        expect(element.style.minHeight).toBe('100px');
        expect(element.style.maxHeight).toBe('400px');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.frame({ width: 100 })).toBe(view);
      });
    });

    describe('foregroundColor()', () => {
      it('should set color with CSS string', () => {
        const view = new View();
        view.foregroundColor('red');
        const element = view._render();

        expect(element.style.color).toBe('red');
      });

      it('should set color with object having rgba method', () => {
        const view = new View();
        const color = { rgba: () => 'rgba(0, 122, 255, 1)' };
        view.foregroundColor(color);
        const element = view._render();

        expect(element.style.color).toBe('rgba(0, 122, 255, 1)');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.foregroundColor('blue')).toBe(view);
      });
    });

    describe('background()', () => {
      it('should set background color with CSS string', () => {
        const view = new View();
        view.background('blue');
        const element = view._render();

        expect(element.style.backgroundColor).toBe('blue');
      });

      it('should set background with object having rgba method', () => {
        const view = new View();
        const color = { rgba: () => 'rgba(255, 0, 0, 0.5)' };
        view.background(color);
        const element = view._render();

        expect(element.style.backgroundColor).toBe('rgba(255, 0, 0, 0.5)');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.background('green')).toBe(view);
      });
    });

    describe('font()', () => {
      it('should apply font styles from object with css method', () => {
        const view = new View();
        const font = {
          css: () => ({ fontSize: '24px', fontWeight: '600' })
        };
        view.font(font);
        const element = view._render();

        expect(element.style.fontSize).toBe('24px');
        expect(element.style.fontWeight).toBe('600');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.font({ css: () => ({}) })).toBe(view);
      });
    });

    describe('opacity()', () => {
      it('should set opacity', () => {
        const view = new View();
        view.opacity(0.5);
        const element = view._render();

        expect(element.style.opacity).toBe('0.5');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.opacity(1)).toBe(view);
      });
    });

    describe('cornerRadius()', () => {
      it('should set border radius', () => {
        const view = new View();
        view.cornerRadius(8);
        const element = view._render();

        expect(element.style.borderRadius).toBe('8px');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.cornerRadius(4)).toBe(view);
      });
    });

    describe('border()', () => {
      it('should set border with color string', () => {
        const view = new View();
        view.border('red', 2);
        const element = view._render();

        expect(element.style.border).toBe('2px solid red');
      });

      it('should use default width of 1', () => {
        const view = new View();
        view.border('blue');
        const element = view._render();

        expect(element.style.border).toBe('1px solid blue');
      });

      it('should set border with color object', () => {
        const view = new View();
        const color = { rgba: () => 'rgba(0, 0, 0, 1)' };
        view.border(color, 3);
        const element = view._render();

        expect(element.style.border).toBe('3px solid rgba(0, 0, 0, 1)');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.border('black')).toBe(view);
      });
    });

    describe('shadow()', () => {
      it('should set box shadow with defaults', () => {
        const view = new View();
        view.shadow();
        const element = view._render();

        expect(element.style.boxShadow).toBe('0px 2px 4px rgba(0,0,0,0.2)');
      });

      it('should set custom shadow', () => {
        const view = new View();
        view.shadow({ color: 'black', radius: 10, x: 5, y: 5 });
        const element = view._render();

        expect(element.style.boxShadow).toBe('5px 5px 10px black');
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.shadow()).toBe(view);
      });
    });

    describe('onTapGesture()', () => {
      it('should set cursor to pointer', () => {
        const view = new View();
        view.onTapGesture(() => {});
        const element = view._render();

        expect(element.style.cursor).toBe('pointer');
      });

      it('should add click event listener', () => {
        const view = new View();
        let clicked = false;
        view.onTapGesture(() => { clicked = true; });
        const element = view._render();

        element.click();

        expect(clicked).toBeTruthy();
      });

      it('should return this for chaining', () => {
        const view = new View();
        expect(view.onTapGesture(() => {})).toBe(view);
      });
    });
  });

  describe('Modifier Chaining', () => {
    it('should apply multiple modifiers in order', () => {
      const view = new View();
      view
        .padding(10)
        .foregroundColor('blue')
        .background('white')
        .cornerRadius(8)
        .opacity(0.9);

      const element = view._render();

      expect(element.style.padding).toBe('10px');
      expect(element.style.color).toBe('blue');
      expect(element.style.backgroundColor).toBe('white');
      expect(element.style.borderRadius).toBe('8px');
      expect(element.style.opacity).toBe('0.9');
    });
  });

  describe('Subclass Support', () => {
    it('should allow subclasses to override body()', () => {
      class CustomView extends View {
        body() {
          const inner = new View();
          inner.padding(5);
          return inner;
        }
      }

      const view = new CustomView();
      const element = view._render();

      expect(element.style.padding).toBe('5px');
    });

    it('should allow subclasses to override _render()', () => {
      class SpanView extends View {
        _render() {
          const span = document.createElement('span');
          span.textContent = 'test';
          return this._applyModifiers(span);
        }
      }

      const view = new SpanView();
      const element = view._render();

      expect(element.tagName).toBe('SPAN');
      expect(element.textContent).toBe('test');
    });

    it('should apply modifiers to custom rendered elements', () => {
      class ButtonView extends View {
        _render() {
          const button = document.createElement('button');
          return this._applyModifiers(button);
        }
      }

      const view = new ButtonView();
      view.padding(20).background('blue');
      const element = view._render();

      expect(element.tagName).toBe('BUTTON');
      expect(element.style.padding).toBe('20px');
      expect(element.style.backgroundColor).toBe('blue');
    });
  });

  describe('Array Body Content', () => {
    it('should render array of views', () => {
      class ListView extends View {
        body() {
          return [
            new View(),
            new View(),
            new View()
          ];
        }
      }

      const view = new ListView();
      const element = view._render();

      expect(element.children.length).toBe(3);
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running View tests...');
}
