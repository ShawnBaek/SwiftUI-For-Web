/**
 * Shader / ShaderLibrary — SwiftUI-style shader effect modifiers, web-side.
 *
 * Mirrors Apple's `Shader` / `ShaderLibrary` API. Whereas Apple compiles
 * Metal Shading Language at build time, we compile preset effects into
 * SVG filter graphs at runtime — applied to any DOM element via
 * `style.filter = url(#id)`.
 *
 * SVG filters are universally GPU-accelerated, work on any element with
 * zero extra setup (no view-to-texture capture), and cover the realistic
 * SwiftUI shader catalog: colorize, brightness, hueRotate, blur, ripple,
 * dropShadow, etc.
 *
 * What this is NOT (yet): arbitrary user-supplied GLSL / WGSL source.
 * Users compose effects from `ShaderLibrary.default`'s curated set. A
 * WebGL2 escape hatch can slot in later behind the same `Shader` API.
 *
 * @see https://developer.apple.com/documentation/swiftui/shader
 * @see https://developer.apple.com/documentation/swiftui/shaderlibrary
 * @see https://developer.apple.com/documentation/swiftui/view/coloreffect(_:isenabled:)
 * @see https://developer.apple.com/documentation/swiftui/view/distortioneffect(_:maxsampleoffset:isenabled:)
 * @see https://developer.apple.com/documentation/swiftui/view/layereffect(_:maxsampleoffset:isenabled:)
 */

/**
 * Effect kinds — match the three SwiftUI shader modifiers.
 * A `Shader` carries one of these so the matching `.xxxEffect()` modifier
 * can sanity-check that you didn't pass a `.blur()` (layer) to
 * `.colorEffect()` etc.
 */
export const ShaderKind = Object.freeze({
  color: 'color',           // → .colorEffect()
  distortion: 'distortion', // → .distortionEffect()
  layer: 'layer'            // → .layerEffect()
});

/**
 * A compiled shader effect. Created via `ShaderLibrary.default.<name>(args)`.
 * Holds enough metadata to lazily build (and reuse) a single SVG <filter>
 * definition in the document.
 */
export class Shader {
  /**
   * @param {string} kind - One of ShaderKind values
   * @param {string} name - Library function name (e.g. 'colorize', 'blur')
   * @param {Object} args - Argument bag for this invocation
   * @param {(filterEl: Element, args: Object) => void} build
   *        Function that appends SVG primitive children to the <filter>.
   */
  constructor(kind, name, args, build) {
    this.kind = kind;
    this.name = name;
    this.args = args;
    this._build = build;
    // Stable id keyed on name + serialized args so reused shaders share
    // a single <filter> definition in the DOM.
    this.id = `swfw-shader-${name}-${stableHash(args)}`;
    Object.freeze(this);
  }

  /** Internal — used by the renderer to populate the <filter> element. */
  _populate(filterEl) {
    this._build(filterEl, this.args);
  }
}

/**
 * `ShaderLibrary.default` is the curated catalogue of preset shader
 * factories. Each factory returns a Shader instance ready to pass to
 * a `.colorEffect()` / `.distortionEffect()` / `.layerEffect()` modifier.
 *
 * The dynamic-member-lookup ergonomics of SwiftUI (`ShaderLibrary.default.foo`)
 * become plain object property access in JS.
 *
 * @example
 *   Image('cat.jpg')
 *     .colorEffect(ShaderLibrary.default.hueRotate(90))
 *     .layerEffect(ShaderLibrary.default.blur(4));
 */
export const ShaderLibrary = Object.freeze({
  default: Object.freeze({
    // ---------- Color effects ----------

    /** Multiply RGB by a target color. Alpha preserved. */
    colorize(color) {
      const [r, g, b, a] = resolveColorRGBA(color);
      return new Shader(ShaderKind.color, 'colorize', { r, g, b, a }, (filter, args) => {
        // Per-channel scale matrix. Multiply each input channel by the
        // target channel value (normalized to 0..1).
        const matrix = [
          args.r, 0,      0,      0, 0,
          0,      args.g, 0,      0, 0,
          0,      0,      args.b, 0, 0,
          0,      0,      0,      1, 0
        ].join(' ');
        appendPrimitive(filter, 'feColorMatrix', { type: 'matrix', values: matrix });
      });
    },

    /** amount: 0 = black, 1 = unchanged, >1 = brighter. */
    brightness(amount) {
      return new Shader(ShaderKind.color, 'brightness', { amount }, (filter, args) => {
        const v = String(args.amount);
        // Linear ramp on R/G/B; identity on A.
        const fn = { type: 'linear', slope: v, intercept: '0' };
        const ct = appendPrimitive(filter, 'feComponentTransfer', {});
        appendPrimitive(ct, 'feFuncR', fn);
        appendPrimitive(ct, 'feFuncG', fn);
        appendPrimitive(ct, 'feFuncB', fn);
      });
    },

    /** amount: 0 = grey, 1 = unchanged, >1 = punchier. */
    contrast(amount) {
      return new Shader(ShaderKind.color, 'contrast', { amount }, (filter, args) => {
        const slope = String(args.amount);
        const intercept = String(-(0.5 * args.amount) + 0.5);
        const fn = { type: 'linear', slope, intercept };
        const ct = appendPrimitive(filter, 'feComponentTransfer', {});
        appendPrimitive(ct, 'feFuncR', fn);
        appendPrimitive(ct, 'feFuncG', fn);
        appendPrimitive(ct, 'feFuncB', fn);
      });
    },

    /** amount: 0 = greyscale, 1 = unchanged. */
    saturation(amount) {
      return new Shader(ShaderKind.color, 'saturation', { amount }, (filter, args) => {
        appendPrimitive(filter, 'feColorMatrix', {
          type: 'saturate',
          values: String(args.amount)
        });
      });
    },

    /** angle in degrees. */
    hueRotate(angleDegrees) {
      return new Shader(ShaderKind.color, 'hueRotate', { angle: angleDegrees }, (filter, args) => {
        appendPrimitive(filter, 'feColorMatrix', {
          type: 'hueRotate',
          values: String(args.angle)
        });
      });
    },

    /** amount: 0 = unchanged, 1 = fully greyscale. */
    grayscale(amount = 1) {
      return new Shader(ShaderKind.color, 'grayscale', { amount }, (filter, args) => {
        appendPrimitive(filter, 'feColorMatrix', {
          type: 'saturate',
          values: String(1 - args.amount)
        });
      });
    },

    /** amount: 0 = unchanged, 1 = fully inverted. */
    invert(amount = 1) {
      return new Shader(ShaderKind.color, 'invert', { amount }, (filter, args) => {
        // Two-stop table: invert when amount=1, identity when amount=0.
        const a = String(args.amount);
        const inv = String(1 - args.amount);
        const fn = { type: 'table', tableValues: `${a} ${inv}` };
        const ct = appendPrimitive(filter, 'feComponentTransfer', {});
        appendPrimitive(ct, 'feFuncR', fn);
        appendPrimitive(ct, 'feFuncG', fn);
        appendPrimitive(ct, 'feFuncB', fn);
      });
    },

    /** amount: 0 = unchanged, 1 = full sepia. Matrix from W3C Filter Effects. */
    sepia(amount = 1) {
      return new Shader(ShaderKind.color, 'sepia', { amount }, (filter, args) => {
        const a = args.amount;
        // Lerp identity ↔ sepia matrix by `amount`.
        const m = (idVal, sepiaVal) => idVal + (sepiaVal - idVal) * a;
        const values = [
          m(1, 0.393), m(0, 0.769), m(0, 0.189), 0, 0,
          m(0, 0.349), m(1, 0.686), m(0, 0.168), 0, 0,
          m(0, 0.272), m(0, 0.534), m(1, 0.131), 0, 0,
          0,           0,           0,           1, 0
        ].map(n => n.toFixed(4)).join(' ');
        appendPrimitive(filter, 'feColorMatrix', { type: 'matrix', values });
      });
    },

    // ---------- Layer effects ----------

    /** Gaussian blur. radius in pixels. */
    blur(radius) {
      return new Shader(ShaderKind.layer, 'blur', { radius }, (filter, args) => {
        appendPrimitive(filter, 'feGaussianBlur', { stdDeviation: String(args.radius) });
      });
    },

    /** SwiftUI-style drop shadow. opts: { color, radius, x, y } */
    dropShadow(opts) {
      const o = opts || {};
      const args = {
        radius: o.radius ?? 4,
        x: o.x ?? 0,
        y: o.y ?? 2,
        color: o.color ?? 'rgba(0,0,0,0.3)'
      };
      return new Shader(ShaderKind.layer, 'dropShadow', args, (filter, a) => {
        const [r, g, b, alpha] = resolveColorRGBA(a.color);
        // SourceAlpha → blur → offset → flood-color → merge with original.
        appendPrimitive(filter, 'feGaussianBlur', {
          in: 'SourceAlpha',
          stdDeviation: String(a.radius),
          result: 'blur'
        });
        appendPrimitive(filter, 'feOffset', {
          in: 'blur',
          dx: String(a.x),
          dy: String(a.y),
          result: 'offsetBlur'
        });
        appendPrimitive(filter, 'feFlood', {
          'flood-color': `rgba(${r * 255},${g * 255},${b * 255},${alpha})`,
          'flood-opacity': '1',
          result: 'colorFlood'
        });
        appendPrimitive(filter, 'feComposite', {
          in: 'colorFlood',
          in2: 'offsetBlur',
          operator: 'in',
          result: 'shadow'
        });
        const merge = appendPrimitive(filter, 'feMerge', {});
        appendPrimitive(merge, 'feMergeNode', { in: 'shadow' });
        appendPrimitive(merge, 'feMergeNode', { in: 'SourceGraphic' });
      });
    },

    // ---------- Distortion effects ----------

    /** Turbulence-displaced ripple. opts: { amplitude, frequency, seed } */
    ripple(opts) {
      const o = opts || {};
      const args = {
        amplitude: o.amplitude ?? 10,
        frequency: o.frequency ?? 0.02,
        seed: o.seed ?? 1
      };
      return new Shader(ShaderKind.distortion, 'ripple', args, (filter, a) => {
        appendPrimitive(filter, 'feTurbulence', {
          type: 'turbulence',
          baseFrequency: String(a.frequency),
          numOctaves: '2',
          seed: String(a.seed),
          result: 'turbulence'
        });
        appendPrimitive(filter, 'feDisplacementMap', {
          in: 'SourceGraphic',
          in2: 'turbulence',
          scale: String(a.amplitude),
          xChannelSelector: 'R',
          yChannelSelector: 'G'
        });
      });
    },

    // ---------- Animated effects ----------
    // These embed SVG <animate> elements inside their filter primitives so
    // the GPU drives the animation; no JS / rAF needed. Same Shader API.

    /**
     * Continuously cycles the hue around the full 360° wheel.
     * opts: { duration } seconds for one full cycle.
     */
    animatedHueRotate(opts) {
      const o = opts || {};
      const args = { duration: o.duration ?? 3 };
      return new Shader(ShaderKind.color, 'animatedHueRotate', args, (filter, a) => {
        const m = appendPrimitive(filter, 'feColorMatrix', {
          type: 'hueRotate',
          values: '0'
        });
        appendPrimitive(m, 'animate', {
          attributeName: 'values',
          from: '0',
          to: '360',
          dur: `${a.duration}s`,
          repeatCount: 'indefinite'
        });
      });
    },

    /**
     * Heat-shimmer / breathing ripple. The displacement scale animates
     * 0 → amplitude → 0 in a loop.
     * opts: { amplitude, frequency, duration }
     */
    animatedRipple(opts) {
      const o = opts || {};
      const args = {
        amplitude: o.amplitude ?? 12,
        frequency: o.frequency ?? 0.02,
        duration: o.duration ?? 2.5,
        seed: o.seed ?? 1
      };
      return new Shader(ShaderKind.distortion, 'animatedRipple', args, (filter, a) => {
        appendPrimitive(filter, 'feTurbulence', {
          type: 'turbulence',
          baseFrequency: String(a.frequency),
          numOctaves: '2',
          seed: String(a.seed),
          result: 'turbulence'
        });
        const disp = appendPrimitive(filter, 'feDisplacementMap', {
          in: 'SourceGraphic',
          in2: 'turbulence',
          scale: '0',
          xChannelSelector: 'R',
          yChannelSelector: 'G'
        });
        appendPrimitive(disp, 'animate', {
          attributeName: 'scale',
          values: `0;${a.amplitude};0`,
          dur: `${a.duration}s`,
          repeatCount: 'indefinite'
        });
      });
    },

    /**
     * Pulsing neon glow — drop shadow whose radius breathes in/out.
     * opts: { color, baseRadius, peakRadius, duration }
     */
    animatedGlow(opts) {
      const o = opts || {};
      const args = {
        color: o.color ?? 'rgba(0,200,255,0.85)',
        baseRadius: o.baseRadius ?? 4,
        peakRadius: o.peakRadius ?? 14,
        duration: o.duration ?? 1.8
      };
      return new Shader(ShaderKind.layer, 'animatedGlow', args, (filter, a) => {
        const [r, g, b, alpha] = resolveColorRGBA(a.color);
        const blur = appendPrimitive(filter, 'feGaussianBlur', {
          in: 'SourceAlpha',
          stdDeviation: String(a.baseRadius),
          result: 'blur'
        });
        appendPrimitive(blur, 'animate', {
          attributeName: 'stdDeviation',
          values: `${a.baseRadius};${a.peakRadius};${a.baseRadius}`,
          dur: `${a.duration}s`,
          repeatCount: 'indefinite'
        });
        appendPrimitive(filter, 'feFlood', {
          'flood-color': `rgba(${r * 255},${g * 255},${b * 255},${alpha})`,
          'flood-opacity': '1',
          result: 'colorFlood'
        });
        appendPrimitive(filter, 'feComposite', {
          in: 'colorFlood',
          in2: 'blur',
          operator: 'in',
          result: 'glow'
        });
        const merge = appendPrimitive(filter, 'feMerge', {});
        appendPrimitive(merge, 'feMergeNode', { in: 'glow' });
        appendPrimitive(merge, 'feMergeNode', { in: 'SourceGraphic' });
      });
    }
  })
});

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Append an SVG primitive child to a parent. Uses the SVG namespace so the
 * element behaves as an actual filter primitive, not an inert HTML node.
 */
function appendPrimitive(parent, tag, attrs) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = parent.ownerDocument
    ? parent.ownerDocument.createElementNS(SVG_NS, tag)
    : document.createElementNS(SVG_NS, tag);
  for (const k in attrs) {
    if (attrs[k] != null) el.setAttribute(k, String(attrs[k]));
  }
  parent.appendChild(el);
  return el;
}

/**
 * Resolve a value (Color instance, CSS string, hex, or `[r,g,b,a]`) into
 * normalized 0..1 RGBA.
 */
function resolveColorRGBA(value) {
  if (Array.isArray(value) && value.length >= 3) {
    return [value[0], value[1], value[2], value[3] ?? 1];
  }
  if (value && typeof value === 'object' && typeof value.rgba === 'function') {
    // Color instance — parse "rgba(r,g,b,a)" → normalized [0..1].
    const m = value.rgba().match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] != null ? +m[4] : 1];
  }
  if (typeof value === 'string') {
    const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
    if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] != null ? +m[4] : 1];
    // #rrggbb or #rgb
    const hex = value.replace('#', '');
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1];
    }
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      return [parseInt(hex[0] + hex[0], 16) / 255, parseInt(hex[1] + hex[1], 16) / 255, parseInt(hex[2] + hex[2], 16) / 255, 1];
    }
  }
  return [1, 1, 1, 1];
}

/**
 * Tiny stable hash over a value. Just enough to give each (name, args)
 * combo a deterministic id; collisions are harmless (same filter id is
 * reused) and rare in practice.
 */
function stableHash(value) {
  const s = JSON.stringify(value, (_k, v) =>
    (v && typeof v === 'object' && typeof v.rgba === 'function') ? v.rgba() : v
  );
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export default Shader;
