/**
 * Font Tests
 * Tests for the Font type
 */

import { describe, it, expect } from '../TestUtils.js';
import { Font, FontValue } from '../../src/Graphic/Font.js';

describe('Font', () => {
  describe('FontValue class', () => {
    it('should store size, weight, and design', () => {
      const font = new FontValue(16, '600', 'rounded');
      expect(font._size).toBe(16);
      expect(font._weight).toBe('600');
      expect(font._design).toBe('rounded');
    });

    it('should default weight to 400', () => {
      const font = new FontValue(16);
      expect(font._weight).toBe('400');
    });

    it('should default design to default', () => {
      const font = new FontValue(16);
      expect(font._design).toBe('default');
    });
  });

  describe('css()', () => {
    it('should return CSS styles object', () => {
      const font = new FontValue(16, '600');
      const styles = font.css();
      expect(styles.fontSize).toBe('16px');
      expect(styles.fontWeight).toBe('600');
    });

    it('should include font family', () => {
      const font = new FontValue(16);
      const styles = font.css();
      expect(styles.fontFamily).toBeTruthy();
    });

    it('should include italic style when set', () => {
      const font = new FontValue(16).italic();
      const styles = font.css();
      expect(styles.fontStyle).toBe('italic');
    });

    it('should include text transform when set', () => {
      const font = new FontValue(16).textCase('uppercase');
      const styles = font.css();
      expect(styles.textTransform).toBe('uppercase');
    });

    it('should include line height when leading is set', () => {
      const font = new FontValue(16).leading('tight');
      const styles = font.css();
      expect(styles.lineHeight).toBe('1.2');
    });
  });

  describe('bold()', () => {
    it('should return font with bold weight', () => {
      const font = new FontValue(16).bold();
      expect(font._weight).toBe('700');
    });

    it('should not modify original font', () => {
      const original = new FontValue(16);
      original.bold();
      expect(original._weight).toBe('400');
    });
  });

  describe('italic()', () => {
    it('should return font with italic style', () => {
      const font = new FontValue(16).italic();
      expect(font._isItalic).toBe(true);
    });

    it('should not modify original font', () => {
      const original = new FontValue(16);
      original.italic();
      expect(original._isItalic).toBe(false);
    });
  });

  describe('monospaced()', () => {
    it('should return monospaced font', () => {
      const font = new FontValue(16).monospaced();
      expect(font._isMonospaced).toBe(true);
    });

    it('should use monospace font family', () => {
      const font = new FontValue(16).monospaced();
      const styles = font.css();
      expect(styles.fontFamily).toContain('monospace');
    });
  });

  describe('weight()', () => {
    it('should set font weight', () => {
      const font = new FontValue(16).weight('600');
      expect(font._weight).toBe('600');
    });

    it('should resolve weight names', () => {
      const font = new FontValue(16).weight('semibold');
      expect(font._weight).toBe('600');
    });
  });

  describe('textCase()', () => {
    it('should set uppercase', () => {
      const font = new FontValue(16).textCase('uppercase');
      expect(font._textCase).toBe('uppercase');
    });

    it('should set lowercase', () => {
      const font = new FontValue(16).textCase('lowercase');
      expect(font._textCase).toBe('lowercase');
    });

    it('should set capitalize', () => {
      const font = new FontValue(16).textCase('capitalize');
      expect(font._textCase).toBe('capitalize');
    });
  });

  describe('leading()', () => {
    it('should set tight leading', () => {
      const font = new FontValue(16).leading('tight');
      expect(font._leading).toBe('1.2');
    });

    it('should set standard leading', () => {
      const font = new FontValue(16).leading('standard');
      expect(font._leading).toBe('1.5');
    });

    it('should set loose leading', () => {
      const font = new FontValue(16).leading('loose');
      expect(font._leading).toBe('1.8');
    });
  });

  describe('Font.Weight', () => {
    it('should have all weight constants', () => {
      expect(Font.Weight.ultraLight).toBe('100');
      expect(Font.Weight.thin).toBe('200');
      expect(Font.Weight.light).toBe('300');
      expect(Font.Weight.regular).toBe('400');
      expect(Font.Weight.medium).toBe('500');
      expect(Font.Weight.semibold).toBe('600');
      expect(Font.Weight.bold).toBe('700');
      expect(Font.Weight.heavy).toBe('800');
      expect(Font.Weight.black).toBe('900');
    });
  });

  describe('Font.Design', () => {
    it('should have all design constants', () => {
      expect(Font.Design.default).toBe('default');
      expect(Font.Design.rounded).toBe('rounded');
      expect(Font.Design.serif).toBe('serif');
      expect(Font.Design.monospaced).toBe('monospaced');
    });
  });

  describe('Font.system()', () => {
    it('should create font with specified size', () => {
      const font = Font.system(20);
      expect(font._size).toBe(20);
    });

    it('should create font with specified weight', () => {
      const font = Font.system(20, Font.Weight.bold);
      expect(font._weight).toBe('700');
    });

    it('should create font with specified design', () => {
      const font = Font.system(20, Font.Weight.regular, Font.Design.rounded);
      expect(font._design).toBe('rounded');
    });

    it('should use rounded font family for rounded design', () => {
      const font = Font.system(20, Font.Weight.regular, Font.Design.rounded);
      const styles = font.css();
      expect(styles.fontFamily).toContain('Rounded');
    });

    it('should use serif font family for serif design', () => {
      const font = Font.system(20, Font.Weight.regular, Font.Design.serif);
      const styles = font.css();
      expect(styles.fontFamily).toContain('serif');
    });

    it('should use monospace font family for monospaced design', () => {
      const font = Font.system(20, Font.Weight.regular, Font.Design.monospaced);
      const styles = font.css();
      expect(styles.fontFamily).toContain('monospace');
    });
  });

  describe('Font.custom()', () => {
    it('should create font with custom family', () => {
      const font = Font.custom('Helvetica', 18);
      expect(font._size).toBe(18);
    });

    it('should use custom font family', () => {
      const font = Font.custom('Helvetica', 18);
      const styles = font.css();
      expect(styles.fontFamily).toContain('Helvetica');
    });
  });

  describe('Text Style Presets', () => {
    it('should have largeTitle (34px)', () => {
      expect(Font.largeTitle._size).toBe(34);
    });

    it('should have title (28px)', () => {
      expect(Font.title._size).toBe(28);
    });

    it('should have title2 (22px)', () => {
      expect(Font.title2._size).toBe(22);
    });

    it('should have title3 (20px)', () => {
      expect(Font.title3._size).toBe(20);
    });

    it('should have headline (17px semibold)', () => {
      expect(Font.headline._size).toBe(17);
      expect(Font.headline._weight).toBe('600');
    });

    it('should have subheadline (15px)', () => {
      expect(Font.subheadline._size).toBe(15);
    });

    it('should have body (17px)', () => {
      expect(Font.body._size).toBe(17);
    });

    it('should have callout (16px)', () => {
      expect(Font.callout._size).toBe(16);
    });

    it('should have footnote (13px)', () => {
      expect(Font.footnote._size).toBe(13);
    });

    it('should have caption (12px)', () => {
      expect(Font.caption._size).toBe(12);
    });

    it('should have caption2 (11px)', () => {
      expect(Font.caption2._size).toBe(11);
    });
  });

  describe('Modifier Chaining', () => {
    it('should support chaining multiple modifiers', () => {
      const font = Font.body.bold().italic();
      expect(font._weight).toBe('700');
      expect(font._isItalic).toBe(true);
    });

    it('should not modify preset fonts', () => {
      const modified = Font.body.bold();
      expect(Font.body._weight).toBe('400');
      expect(modified._weight).toBe('700');
    });
  });

  describe('CSS Output', () => {
    it('should generate valid CSS for view modifiers', () => {
      const font = Font.title.bold();
      const styles = font.css();

      expect(styles.fontSize).toBe('28px');
      expect(styles.fontWeight).toBe('700');
      expect(styles.fontFamily).toBeTruthy();
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running Font tests...');
}
