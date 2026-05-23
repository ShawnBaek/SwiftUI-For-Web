/**
 * Shader / ShaderLibrary tests — browser runner.
 *
 * Mirrors the inline run-tests.js coverage with one extra: actual
 * SVG <filter> mounting (the Node mock can't fully emulate this).
 */

import { describe, it, expect } from '../TestUtils.js';
import { Shader, ShaderLibrary, ShaderKind } from '../../src/Graphic/Shader.js';
import { Text } from '../../src/View/Text.js';
import { render } from '../../src/Core/Renderer.js';

describe('Shader / ShaderLibrary', () => {
  describe('ShaderKind', () => {
    it('exposes color/distortion/layer kinds', () => {
      expect(ShaderKind.color).toBe('color');
      expect(ShaderKind.distortion).toBe('distortion');
      expect(ShaderKind.layer).toBe('layer');
    });
  });

  describe('Shader instances', () => {
    it('are frozen', () => {
      const s = ShaderLibrary.default.brightness(0.5);
      expect(Object.isFrozen(s)).toBeTruthy();
    });

    it('have stable ids keyed on args', () => {
      const a = ShaderLibrary.default.brightness(0.5);
      const b = ShaderLibrary.default.brightness(0.5);
      const c = ShaderLibrary.default.brightness(0.7);
      expect(a.id).toBe(b.id);
      expect(a.id).not.toBe(c.id);
    });

    it('tag color presets with kind=color', () => {
      expect(ShaderLibrary.default.colorize([1, 0, 0, 1]).kind).toBe('color');
      expect(ShaderLibrary.default.brightness(1.2).kind).toBe('color');
      expect(ShaderLibrary.default.contrast(1.5).kind).toBe('color');
      expect(ShaderLibrary.default.saturation(0).kind).toBe('color');
      expect(ShaderLibrary.default.hueRotate(180).kind).toBe('color');
      expect(ShaderLibrary.default.grayscale(1).kind).toBe('color');
      expect(ShaderLibrary.default.invert(1).kind).toBe('color');
      expect(ShaderLibrary.default.sepia(1).kind).toBe('color');
    });

    it('tag layer presets with kind=layer', () => {
      expect(ShaderLibrary.default.blur(4).kind).toBe('layer');
      expect(ShaderLibrary.default.dropShadow({ radius: 4 }).kind).toBe('layer');
    });

    it('tag distortion presets with kind=distortion', () => {
      expect(ShaderLibrary.default.ripple({ amplitude: 5 }).kind).toBe('distortion');
    });
  });

  describe('SVG <filter> mounting', () => {
    it('appends a <filter> with the shader id to the shared defs', () => {
      const shader = ShaderLibrary.default.hueRotate(45);
      // Render any view with the shader applied; this mounts the filter.
      render(Text('x').colorEffect(shader));
      const mounted = document.getElementById(shader.id);
      expect(mounted).toBeTruthy();
      expect(mounted.tagName.toLowerCase()).toBe('filter');
    });

    it('reuses the same <filter> on second use (no duplicate mount)', () => {
      const shader = ShaderLibrary.default.saturation(0.5);
      render(Text('a').colorEffect(shader));
      render(Text('b').colorEffect(shader));
      const all = document.querySelectorAll(`#${shader.id}`);
      expect(all.length).toBe(1);
    });
  });

  describe('.colorEffect / .distortionEffect / .layerEffect on Text', () => {
    it('sets element.style.filter to url(#shaderId)', () => {
      const shader = ShaderLibrary.default.grayscale(1);
      const el = render(Text('Hi').colorEffect(shader));
      expect(el.style.filter).toContain(`url(#${shader.id})`);
    });

    it('composes chained effects with space-separated url() refs', () => {
      const a = ShaderLibrary.default.invert(1);
      const b = ShaderLibrary.default.blur(2);
      const el = render(Text('Hi').colorEffect(a).layerEffect(b));
      expect(el.style.filter).toContain(`url(#${a.id})`);
      expect(el.style.filter).toContain(`url(#${b.id})`);
      // a comes before b — CSS filter applies left-to-right.
      const aIdx = el.style.filter.indexOf(`url(#${a.id})`);
      const bIdx = el.style.filter.indexOf(`url(#${b.id})`);
      expect(aIdx < bIdx).toBeTruthy();
    });

    it('returns a new immutable descriptor', () => {
      const base = Text('Hi');
      const next = base.colorEffect(ShaderLibrary.default.brightness(2));
      expect(next).not.toBe(base);
      expect(next.type).toBe('Text');
    });

    it('skips silently when { isEnabled: false }', () => {
      const shader = ShaderLibrary.default.hueRotate(90);
      const el = render(Text('Hi').colorEffect(shader, { isEnabled: false }));
      expect(el.style.filter || '').not.toContain(`url(#${shader.id})`);
    });
  });
});
