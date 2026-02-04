/**
 * Color Tests
 * Tests for the Color type
 */

import { describe, it, expect } from '../TestUtils.js';
import { Color, ColorValue } from '../../src/Graphic/Color.js';

describe('Color', () => {
  describe('ColorValue class', () => {
    it('should store RGBA components', () => {
      const color = new ColorValue(255, 128, 64, 0.5);
      expect(color._r).toBe(255);
      expect(color._g).toBe(128);
      expect(color._b).toBe(64);
      expect(color._a).toBe(0.5);
    });

    it('should default alpha to 1', () => {
      const color = new ColorValue(255, 0, 0);
      expect(color._a).toBe(1);
    });
  });

  describe('rgba()', () => {
    it('should return rgba CSS string', () => {
      const color = new ColorValue(255, 128, 64, 0.5);
      expect(color.rgba()).toBe('rgba(255, 128, 64, 0.5)');
    });

    it('should handle full opacity', () => {
      const color = new ColorValue(255, 0, 0, 1);
      expect(color.rgba()).toBe('rgba(255, 0, 0, 1)');
    });
  });

  describe('rgb()', () => {
    it('should return rgb CSS string', () => {
      const color = new ColorValue(255, 128, 64, 0.5);
      expect(color.rgb()).toBe('rgb(255, 128, 64)');
    });
  });

  describe('hex()', () => {
    it('should return hex color string', () => {
      const color = new ColorValue(255, 0, 0);
      expect(color.hex()).toBe('#ff0000');
    });

    it('should pad single digit hex values', () => {
      const color = new ColorValue(0, 15, 255);
      expect(color.hex()).toBe('#000fff');
    });
  });

  describe('opacity()', () => {
    it('should create new color with specified opacity', () => {
      const color = new ColorValue(255, 0, 0, 1);
      const transparent = color.opacity(0.5);
      expect(transparent.rgba()).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should not modify original color', () => {
      const color = new ColorValue(255, 0, 0, 1);
      color.opacity(0.5);
      expect(color._a).toBe(1);
    });
  });

  describe('toString()', () => {
    it('should return rgba string', () => {
      const color = new ColorValue(255, 0, 0, 0.8);
      expect(color.toString()).toBe('rgba(255, 0, 0, 0.8)');
    });
  });

  describe('css()', () => {
    it('should return rgba string', () => {
      const color = new ColorValue(255, 0, 0, 0.8);
      expect(color.css()).toBe('rgba(255, 0, 0, 0.8)');
    });
  });

  describe('Color.rgb()', () => {
    it('should create color from RGB values', () => {
      const color = Color.rgb(255, 128, 64);
      expect(color.rgba()).toBe('rgba(255, 128, 64, 1)');
    });
  });

  describe('Color.rgba()', () => {
    it('should create color from RGBA values', () => {
      const color = Color.rgba(255, 128, 64, 0.5);
      expect(color.rgba()).toBe('rgba(255, 128, 64, 0.5)');
    });
  });

  describe('Color.hex()', () => {
    it('should create color from hex string with #', () => {
      const color = Color.hex('#FF0000');
      expect(color.rgba()).toBe('rgba(255, 0, 0, 1)');
    });

    it('should create color from hex string without #', () => {
      const color = Color.hex('00FF00');
      expect(color.rgba()).toBe('rgba(0, 255, 0, 1)');
    });

    it('should handle shorthand hex', () => {
      const color = Color.hex('#F00');
      expect(color.rgba()).toBe('rgba(255, 0, 0, 1)');
    });

    it('should handle lowercase hex', () => {
      const color = Color.hex('#ff8800');
      expect(color.rgba()).toBe('rgba(255, 136, 0, 1)');
    });
  });

  describe('Color.hsl()', () => {
    it('should create red from HSL', () => {
      const color = Color.hsl(0, 100, 50);
      expect(color._r).toBe(255);
      expect(color._g).toBe(0);
      expect(color._b).toBe(0);
    });

    it('should create green from HSL', () => {
      const color = Color.hsl(120, 100, 50);
      expect(color._r).toBe(0);
      expect(color._g).toBe(255);
      expect(color._b).toBe(0);
    });

    it('should create blue from HSL', () => {
      const color = Color.hsl(240, 100, 50);
      expect(color._r).toBe(0);
      expect(color._g).toBe(0);
      expect(color._b).toBe(255);
    });
  });

  describe('System Colors', () => {
    it('should have blue color', () => {
      expect(Color.blue).toBeInstanceOf(ColorValue);
      expect(Color.blue.rgba()).toBe('rgba(0, 122, 255, 1)');
    });

    it('should have red color', () => {
      expect(Color.red).toBeInstanceOf(ColorValue);
      expect(Color.red.rgba()).toBe('rgba(255, 59, 48, 1)');
    });

    it('should have green color', () => {
      expect(Color.green).toBeInstanceOf(ColorValue);
      expect(Color.green.rgba()).toBe('rgba(52, 199, 89, 1)');
    });

    it('should have yellow color', () => {
      expect(Color.yellow).toBeInstanceOf(ColorValue);
    });

    it('should have orange color', () => {
      expect(Color.orange).toBeInstanceOf(ColorValue);
    });

    it('should have purple color', () => {
      expect(Color.purple).toBeInstanceOf(ColorValue);
    });

    it('should have pink color', () => {
      expect(Color.pink).toBeInstanceOf(ColorValue);
    });

    it('should have indigo color', () => {
      expect(Color.indigo).toBeInstanceOf(ColorValue);
    });

    it('should have teal color', () => {
      expect(Color.teal).toBeInstanceOf(ColorValue);
    });

    it('should have cyan color', () => {
      expect(Color.cyan).toBeInstanceOf(ColorValue);
    });

    it('should have mint color', () => {
      expect(Color.mint).toBeInstanceOf(ColorValue);
    });

    it('should have brown color', () => {
      expect(Color.brown).toBeInstanceOf(ColorValue);
    });
  });

  describe('Gray Scale', () => {
    it('should have gray colors', () => {
      expect(Color.gray).toBeInstanceOf(ColorValue);
      expect(Color.gray2).toBeInstanceOf(ColorValue);
      expect(Color.gray3).toBeInstanceOf(ColorValue);
      expect(Color.gray4).toBeInstanceOf(ColorValue);
      expect(Color.gray5).toBeInstanceOf(ColorValue);
      expect(Color.gray6).toBeInstanceOf(ColorValue);
    });
  });

  describe('Semantic Colors', () => {
    it('should have primary color', () => {
      expect(Color.primary).toBeInstanceOf(ColorValue);
    });

    it('should have secondary color', () => {
      expect(Color.secondary).toBeInstanceOf(ColorValue);
    });

    it('should have background color', () => {
      expect(Color.background).toBeInstanceOf(ColorValue);
    });

    it('should have label colors', () => {
      expect(Color.label).toBeInstanceOf(ColorValue);
      expect(Color.secondaryLabel).toBeInstanceOf(ColorValue);
      expect(Color.tertiaryLabel).toBeInstanceOf(ColorValue);
    });
  });

  describe('Basic Colors', () => {
    it('should have white', () => {
      expect(Color.white.rgba()).toBe('rgba(255, 255, 255, 1)');
    });

    it('should have black', () => {
      expect(Color.black.rgba()).toBe('rgba(0, 0, 0, 1)');
    });

    it('should have clear (transparent)', () => {
      expect(Color.clear.rgba()).toBe('rgba(0, 0, 0, 0)');
    });
  });

  describe('Color with opacity modifier', () => {
    it('should work with system colors', () => {
      const transparent = Color.blue.opacity(0.5);
      expect(transparent.rgba()).toBe('rgba(0, 122, 255, 0.5)');
    });

    it('should chain with other methods', () => {
      const color = Color.red.opacity(0.3);
      expect(color.hex()).toBe('#ff3b30');
      expect(color.rgba()).toBe('rgba(255, 59, 48, 0.3)');
    });
  });
});

// Run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  console.log('Running Color tests...');
}
