/**
 * Text Tests
 * Tests for the Text view component (descriptor-based API)
 */

import { describe, it, expect } from '../TestUtils.js';
import { Text } from '../../src/View/Text.js';
import { render } from '../../src/Core/Renderer.js';

describe('Text', () => {
  describe('Factory Function', () => {
    it('should create a descriptor with type Text', () => {
      const text = Text('Hello');
      expect(text.type).toBe('Text');
    });

    it('should be a frozen object', () => {
      const text = Text('Hello');
      expect(Object.isFrozen(text)).toBeTruthy();
    });
  });

  describe('Descriptor Properties', () => {
    it('should store the content in props', () => {
      const text = Text('Hello, World!');
      expect(text.props.content).toBe('Hello, World!');
    });

    it('should convert numbers to string in props', () => {
      const text = Text(42);
      expect(text.props.content).toBe('42');
    });
  });

  describe('render()', () => {
    it('should create a span element', () => {
      const text = Text('Hello');
      const element = render(text);
      expect(element.tagName).toBe('SPAN');
    });

    it('should set the text content', () => {
      const text = Text('Hello, World!');
      const element = render(text);
      expect(element.textContent).toBe('Hello, World!');
    });

    it('should convert numbers to string', () => {
      const text = Text(12345);
      const element = render(text);
      expect(element.textContent).toBe('12345');
    });
  });

  describe('fontWeight()', () => {
    it('should set font weight', () => {
      const text = Text('Hello').fontWeight('semibold');
      const element = render(text);
      expect(element.style.fontWeight).toBe('600');
    });

    it('should return a new descriptor (immutable)', () => {
      const text = Text('Hello');
      const weighted = text.fontWeight('bold');
      expect(weighted).not.toBe(text);
      expect(weighted.type).toBe('Text');
    });

    it('should map SwiftUI weight names to CSS values', () => {
      const weights = {
        ultraLight: '100',
        thin: '200',
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        heavy: '800',
        black: '900'
      };

      for (const [name, value] of Object.entries(weights)) {
        const text = Text('Test').fontWeight(name);
        const element = render(text);
        expect(element.style.fontWeight).toBe(value);
      }
    });
  });

  describe('bold()', () => {
    it('should set font weight to bold', () => {
      const text = Text('Hello').bold();
      const element = render(text);
      expect(element.style.fontWeight).toBe('700');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const bolded = text.bold();
      expect(bolded).not.toBe(text);
      expect(bolded.type).toBe('Text');
    });
  });

  describe('italic()', () => {
    it('should set font style to italic', () => {
      const text = Text('Hello').italic();
      const element = render(text);
      expect(element.style.fontStyle).toBe('italic');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const italicized = text.italic();
      expect(italicized).not.toBe(text);
    });
  });

  describe('underline()', () => {
    it('should add underline decoration', () => {
      const text = Text('Hello').underline();
      const element = render(text);
      expect(element.style.textDecoration).toContain('underline');
    });

    it('should not add underline when active is false', () => {
      const text = Text('Hello').underline(false);
      const element = render(text);
      expect(element.style.textDecoration).not.toContain('underline');
    });

    it('should apply custom color', () => {
      const text = Text('Hello').underline(true, 'red');
      const element = render(text);
      expect(element.style.textDecorationColor).toBe('red');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const underlined = text.underline();
      expect(underlined).not.toBe(text);
    });
  });

  describe('strikethrough()', () => {
    it('should add line-through decoration', () => {
      const text = Text('Hello').strikethrough();
      const element = render(text);
      expect(element.style.textDecoration).toContain('line-through');
    });

    it('should not add strikethrough when active is false', () => {
      const text = Text('Hello').strikethrough(false);
      const element = render(text);
      expect(element.style.textDecoration).not.toContain('line-through');
    });

    it('should apply custom color', () => {
      const text = Text('Hello').strikethrough(true, 'blue');
      const element = render(text);
      expect(element.style.textDecorationColor).toBe('blue');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const struck = text.strikethrough();
      expect(struck).not.toBe(text);
    });
  });

  describe('Combined text decorations', () => {
    it('should combine underline and strikethrough', () => {
      const text = Text('Hello').underline().strikethrough();
      const element = render(text);
      expect(element.style.textDecoration).toContain('underline');
      expect(element.style.textDecoration).toContain('line-through');
    });
  });

  describe('multilineTextAlignment()', () => {
    it('should set text alignment to left for leading', () => {
      const text = Text('Hello').multilineTextAlignment('leading');
      const element = render(text);
      expect(element.style.textAlign).toBe('left');
    });

    it('should set text alignment to center', () => {
      const text = Text('Hello').multilineTextAlignment('center');
      const element = render(text);
      expect(element.style.textAlign).toBe('center');
    });

    it('should set text alignment to right for trailing', () => {
      const text = Text('Hello').multilineTextAlignment('trailing');
      const element = render(text);
      expect(element.style.textAlign).toBe('right');
    });

    it('should set display to block for alignment to work', () => {
      const text = Text('Hello').multilineTextAlignment('center');
      const element = render(text);
      expect(element.style.display).toBe('block');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const aligned = text.multilineTextAlignment('center');
      expect(aligned).not.toBe(text);
    });
  });

  describe('lineLimit()', () => {
    it('should set webkit line clamp', () => {
      const text = Text('Hello').lineLimit(2);
      const element = render(text);
      expect(element.style.webkitLineClamp).toBe('2');
    });

    it('should set overflow to hidden', () => {
      const text = Text('Hello').lineLimit(3);
      const element = render(text);
      expect(element.style.overflow).toBe('hidden');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const limited = text.lineLimit(1);
      expect(limited).not.toBe(text);
    });
  });

  describe('kerning()', () => {
    it('should set letter spacing', () => {
      const text = Text('Hello').kerning(2);
      const element = render(text);
      expect(element.style.letterSpacing).toBe('2px');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const kerned = text.kerning(1);
      expect(kerned).not.toBe(text);
    });
  });

  describe('lineSpacing()', () => {
    it('should set line height', () => {
      const text = Text('Hello').lineSpacing(8);
      const element = render(text);
      expect(element.style.lineHeight).toBeTruthy();
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const spaced = text.lineSpacing(4);
      expect(spaced).not.toBe(text);
    });
  });

  describe('monospacedDigit()', () => {
    it('should set font variant numeric to tabular-nums', () => {
      const text = Text('12345').monospacedDigit();
      const element = render(text);
      expect(element.style.fontVariantNumeric).toBe('tabular-nums');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const mono = text.monospacedDigit();
      expect(mono).not.toBe(text);
    });
  });

  describe('baselineOffset()', () => {
    it('should set vertical align', () => {
      const text = Text('Hello').baselineOffset(5);
      const element = render(text);
      expect(element.style.verticalAlign).toBe('5px');
    });

    it('should return a new descriptor', () => {
      const text = Text('Hello');
      const offset = text.baselineOffset(2);
      expect(offset).not.toBe(text);
    });
  });

  describe('Standard Modifiers', () => {
    it('should support padding modifier', () => {
      const text = Text('Hello').padding(20);
      const element = render(text);
      expect(element.style.padding).toBe('20px');
    });

    it('should support foregroundColor modifier', () => {
      const text = Text('Hello').foregroundColor('blue');
      const element = render(text);
      expect(element.style.color).toBe('blue');
    });

    it('should support background modifier', () => {
      const text = Text('Hello').background('yellow');
      const element = render(text);
      expect(element.style.backgroundColor).toBe('yellow');
    });

    it('should support opacity modifier', () => {
      const text = Text('Hello').opacity(0.5);
      const element = render(text);
      expect(element.style.opacity).toBe('0.5');
    });

    it('should support cornerRadius modifier', () => {
      const text = Text('Hello').cornerRadius(8);
      const element = render(text);
      expect(element.style.borderRadius).toBe('8px');
    });
  });

  describe('Modifier Chaining', () => {
    it('should support chaining multiple text modifiers', () => {
      const text = Text('Hello')
        .bold()
        .italic()
        .underline();
      const element = render(text);

      expect(element.style.fontWeight).toBe('700');
      expect(element.style.fontStyle).toBe('italic');
      expect(element.style.textDecoration).toContain('underline');
    });

    it('should support chaining text and standard modifiers', () => {
      const text = Text('Hello')
        .bold()
        .foregroundColor('red')
        .padding(10)
        .background('white');
      const element = render(text);

      expect(element.style.fontWeight).toBe('700');
      expect(element.style.color).toBe('red');
      expect(element.style.padding).toBe('10px');
      expect(element.style.backgroundColor).toBe('white');
    });
  });

  describe('Color Object Support', () => {
    it('should support color objects with rgba method for underline', () => {
      const mockColor = { rgba: () => 'rgba(255, 0, 0, 1)' };
      const text = Text('Hello').underline(true, mockColor);
      const element = render(text);
      // Browser normalizes rgba(r,g,b,1) to rgb(r,g,b)
      expect(element.style.textDecorationColor).toContain('255, 0, 0');
    });

    it('should support color objects with rgba method for strikethrough', () => {
      const mockColor = { rgba: () => 'rgba(0, 0, 255, 1)' };
      const text = Text('Hello').strikethrough(true, mockColor);
      const element = render(text);
      // Browser normalizes rgba(r,g,b,1) to rgb(r,g,b)
      expect(element.style.textDecorationColor).toContain('0, 0, 255');
    });
  });
});
