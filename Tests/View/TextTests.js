/**
 * Text Tests
 * Tests for the Text view component
 */

import { describe, it, expect } from '../TestUtils.js';
import { Text, TextView } from '../../src/View/Text.js';
import { View } from '../../src/Core/View.js';

describe('Text', () => {
  describe('Factory Function', () => {
    it('should create a TextView instance', () => {
      const text = Text('Hello');
      expect(text).toBeInstanceOf(TextView);
    });

    it('should create a View instance', () => {
      const text = Text('Hello');
      expect(text).toBeInstanceOf(View);
    });
  });

  describe('Constructor', () => {
    it('should store the content', () => {
      const text = Text('Hello, World!');
      expect(text._content).toBe('Hello, World!');
    });

    it('should accept numbers as content', () => {
      const text = Text(42);
      expect(text._content).toBe(42);
    });

    it('should initialize text-specific properties', () => {
      const text = Text('Test');
      expect(text._fontWeight).toBeNull();
      expect(text._isItalic).toBe(false);
      expect(text._isUnderline).toBe(false);
      expect(text._isStrikethrough).toBe(false);
    });
  });

  describe('body()', () => {
    it('should return this (leaf view)', () => {
      const text = Text('Hello');
      expect(text.body()).toBe(text);
    });
  });

  describe('_render()', () => {
    it('should create a span element', () => {
      const text = Text('Hello');
      const element = text._render();
      expect(element.tagName).toBe('SPAN');
    });

    it('should set the text content', () => {
      const text = Text('Hello, World!');
      const element = text._render();
      expect(element.textContent).toBe('Hello, World!');
    });

    it('should convert numbers to string', () => {
      const text = Text(12345);
      const element = text._render();
      expect(element.textContent).toBe('12345');
    });

    it('should set data-view attribute to Text', () => {
      const text = Text('Hello');
      const element = text._render();
      expect(element.dataset.view).toBe('Text');
    });
  });

  describe('fontWeight()', () => {
    it('should set font weight', () => {
      const text = Text('Hello').fontWeight('semibold');
      const element = text._render();
      expect(element.style.fontWeight).toBe('600');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.fontWeight('bold')).toBe(text);
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
        const element = text._render();
        expect(element.style.fontWeight).toBe(value);
      }
    });
  });

  describe('bold()', () => {
    it('should set font weight to bold', () => {
      const text = Text('Hello').bold();
      const element = text._render();
      expect(element.style.fontWeight).toBe('700');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.bold()).toBe(text);
    });
  });

  describe('italic()', () => {
    it('should set font style to italic', () => {
      const text = Text('Hello').italic();
      const element = text._render();
      expect(element.style.fontStyle).toBe('italic');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.italic()).toBe(text);
    });
  });

  describe('underline()', () => {
    it('should add underline decoration', () => {
      const text = Text('Hello').underline();
      const element = text._render();
      expect(element.style.textDecoration).toContain('underline');
    });

    it('should not add underline when active is false', () => {
      const text = Text('Hello').underline(false);
      const element = text._render();
      expect(element.style.textDecoration).not.toContain('underline');
    });

    it('should apply custom color', () => {
      const text = Text('Hello').underline(true, 'red');
      const element = text._render();
      expect(element.style.textDecorationColor).toBe('red');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.underline()).toBe(text);
    });
  });

  describe('strikethrough()', () => {
    it('should add line-through decoration', () => {
      const text = Text('Hello').strikethrough();
      const element = text._render();
      expect(element.style.textDecoration).toContain('line-through');
    });

    it('should not add strikethrough when active is false', () => {
      const text = Text('Hello').strikethrough(false);
      const element = text._render();
      expect(element.style.textDecoration).not.toContain('line-through');
    });

    it('should apply custom color', () => {
      const text = Text('Hello').strikethrough(true, 'blue');
      const element = text._render();
      expect(element.style.textDecorationColor).toBe('blue');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.strikethrough()).toBe(text);
    });
  });

  describe('Combined text decorations', () => {
    it('should combine underline and strikethrough', () => {
      const text = Text('Hello').underline().strikethrough();
      const element = text._render();
      expect(element.style.textDecoration).toContain('underline');
      expect(element.style.textDecoration).toContain('line-through');
    });
  });

  describe('multilineTextAlignment()', () => {
    it('should set text alignment to left for leading', () => {
      const text = Text('Hello').multilineTextAlignment('leading');
      const element = text._render();
      expect(element.style.textAlign).toBe('left');
    });

    it('should set text alignment to center', () => {
      const text = Text('Hello').multilineTextAlignment('center');
      const element = text._render();
      expect(element.style.textAlign).toBe('center');
    });

    it('should set text alignment to right for trailing', () => {
      const text = Text('Hello').multilineTextAlignment('trailing');
      const element = text._render();
      expect(element.style.textAlign).toBe('right');
    });

    it('should set display to block for alignment to work', () => {
      const text = Text('Hello').multilineTextAlignment('center');
      const element = text._render();
      expect(element.style.display).toBe('block');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.multilineTextAlignment('center')).toBe(text);
    });
  });

  describe('lineLimit()', () => {
    it('should set webkit line clamp', () => {
      const text = Text('Hello').lineLimit(2);
      const element = text._render();
      expect(element.style.webkitLineClamp).toBe('2');
    });

    it('should set overflow to hidden', () => {
      const text = Text('Hello').lineLimit(3);
      const element = text._render();
      expect(element.style.overflow).toBe('hidden');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.lineLimit(1)).toBe(text);
    });
  });

  describe('truncationMode()', () => {
    it('should store truncation mode', () => {
      const text = Text('Hello').truncationMode('tail');
      expect(text._truncationMode).toBe('tail');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.truncationMode('middle')).toBe(text);
    });
  });

  describe('kerning()', () => {
    it('should set letter spacing', () => {
      const text = Text('Hello').kerning(2);
      const element = text._render();
      expect(element.style.letterSpacing).toBe('2px');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.kerning(1)).toBe(text);
    });
  });

  describe('lineSpacing()', () => {
    it('should set line height', () => {
      const text = Text('Hello').lineSpacing(8);
      const element = text._render();
      expect(element.style.lineHeight).toBeTruthy();
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.lineSpacing(4)).toBe(text);
    });
  });

  describe('monospacedDigit()', () => {
    it('should set font variant numeric to tabular-nums', () => {
      const text = Text('12345').monospacedDigit();
      const element = text._render();
      expect(element.style.fontVariantNumeric).toBe('tabular-nums');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.monospacedDigit()).toBe(text);
    });
  });

  describe('baselineOffset()', () => {
    it('should set vertical align', () => {
      const text = Text('Hello').baselineOffset(5);
      const element = text._render();
      expect(element.style.verticalAlign).toBe('5px');
    });

    it('should return this for chaining', () => {
      const text = Text('Hello');
      expect(text.baselineOffset(2)).toBe(text);
    });
  });

  describe('Inherited View Modifiers', () => {
    it('should support padding modifier', () => {
      const text = Text('Hello').padding(20);
      const element = text._render();
      expect(element.style.padding).toBe('20px');
    });

    it('should support foregroundColor modifier', () => {
      const text = Text('Hello').foregroundColor('blue');
      const element = text._render();
      expect(element.style.color).toBe('blue');
    });

    it('should support background modifier', () => {
      const text = Text('Hello').background('yellow');
      const element = text._render();
      expect(element.style.backgroundColor).toBe('yellow');
    });

    it('should support opacity modifier', () => {
      const text = Text('Hello').opacity(0.5);
      const element = text._render();
      expect(element.style.opacity).toBe('0.5');
    });

    it('should support cornerRadius modifier', () => {
      const text = Text('Hello').cornerRadius(8);
      const element = text._render();
      expect(element.style.borderRadius).toBe('8px');
    });
  });

  describe('Modifier Chaining', () => {
    it('should support chaining multiple text modifiers', () => {
      const text = Text('Hello')
        .bold()
        .italic()
        .underline();
      const element = text._render();

      expect(element.style.fontWeight).toBe('700');
      expect(element.style.fontStyle).toBe('italic');
      expect(element.style.textDecoration).toContain('underline');
    });

    it('should support chaining text and view modifiers', () => {
      const text = Text('Hello')
        .bold()
        .foregroundColor('red')
        .padding(10)
        .background('white');
      const element = text._render();

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
      const element = text._render();
      expect(element.style.textDecorationColor).toBe('rgba(255, 0, 0, 1)');
    });

    it('should support color objects with rgba method for strikethrough', () => {
      const mockColor = { rgba: () => 'rgba(0, 0, 255, 1)' };
      const text = Text('Hello').strikethrough(true, mockColor);
      const element = text._render();
      expect(element.style.textDecorationColor).toBe('rgba(0, 0, 255, 1)');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running Text tests...');
}
