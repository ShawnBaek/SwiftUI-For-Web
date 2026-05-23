/**
 * Metal Shader Gallery — animated SwiftUI shader-effect modifiers.
 *
 * Uses `ShaderLibrary.default.animatedHueRotate`, `.animatedRipple`,
 * `.animatedGlow` — each embeds an SVG <animate> element inside its
 * filter primitive so the browser GPU drives the animation. No
 * requestAnimationFrame, no setInterval, no JS overhead at runtime.
 *
 * Counterpart to the static ShaderEffects example: that one shows each
 * preset frozen in place; this one shows them in motion, the way Apple's
 * WWDC Metal-shader demos play.
 */

import {
  App,
  VStack,
  HStack,
  Text,
  Image,
  Spacer,
  Color,
  Font,
  ShaderLibrary
} from '../../src/index.js';

const Lib = ShaderLibrary.default;

// Two complementary CC0 images — one warm (city night neon) and one cool
// (mountain dawn). Hue rotation + ripple both read more strongly when the
// source has rich tonal variety.
const NEON  = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=420&q=70';
const DAWN  = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=420&q=70';
const PORTRAIT = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=320&q=70';

const tile = (w, h, src) => Image(src).resizable().frame({ width: w, height: h }).cornerRadius(14);

const Caption = (text) =>
  Text(text)
    .font(Font.caption)
    .foregroundColor(Color.gray);

const Card = (label, view) =>
  VStack({ spacing: 10, alignment: 'center' },
    view,
    Caption(label)
  );

// ─── Header ──────────────────────────────────────────────────────────────
const Header = () =>
  VStack({ spacing: 12, alignment: 'leading' },
    Text('Metal Shader Gallery')
      .font(Font.largeTitle)
      .foregroundColor(Color.white)
      .layerEffect(Lib.animatedGlow({
        color: 'rgba(140, 100, 255, 0.55)',
        baseRadius: 2,
        peakRadius: 10,
        duration: 2.6
      })),
    Text('Animated SwiftUI shader-effect modifiers — backed by SVG <animate>. Every effect on this page is GPU-driven; the page itself is static.')
      .font(Font.subheadline)
      .foregroundColor(Color.gray)
      .frame({ maxWidth: 720 })
  );

// ─── Section 1: Animated hue cycle, staggered durations ─────────────────
const HueWave = () =>
  VStack({ spacing: 18, alignment: 'leading' },
    Text('Hue Cycle').font(Font.headline).foregroundColor(Color.white),
    Caption('Same image, four different cycle speeds — colours drift out of phase like a slow chromatic wave.'),
    HStack({ spacing: 14 },
      Card('2.0s',  tile(150, 110, NEON).colorEffect(Lib.animatedHueRotate({ duration: 2.0 }))),
      Card('3.5s',  tile(150, 110, NEON).colorEffect(Lib.animatedHueRotate({ duration: 3.5 }))),
      Card('5.0s',  tile(150, 110, NEON).colorEffect(Lib.animatedHueRotate({ duration: 5.0 }))),
      Card('8.0s',  tile(150, 110, NEON).colorEffect(Lib.animatedHueRotate({ duration: 8.0 })))
    )
  );

// ─── Section 2: Heat shimmer with breathing ripple ──────────────────────
const HeatShimmer = () =>
  VStack({ spacing: 18, alignment: 'leading' },
    Text('Heat Shimmer').font(Font.headline).foregroundColor(Color.white),
    Caption('animatedRipple — feDisplacementMap.scale animated 0 → amplitude → 0, looping.'),
    HStack({ spacing: 16 },
      Card('subtle',   tile(180, 240, DAWN).distortionEffect(Lib.animatedRipple({ amplitude: 6,  duration: 3.0 }), { maxSampleOffset: { width: 6, height: 6 } })),
      Card('moderate', tile(180, 240, DAWN).distortionEffect(Lib.animatedRipple({ amplitude: 14, duration: 2.5 }), { maxSampleOffset: { width: 14, height: 14 } })),
      Card('intense',  tile(180, 240, DAWN).distortionEffect(Lib.animatedRipple({ amplitude: 28, duration: 2.0 }), { maxSampleOffset: { width: 28, height: 28 } }))
    )
  );

// ─── Section 3: Composed — chrome / holographic look ────────────────────
const Holographic = () =>
  VStack({ spacing: 18, alignment: 'leading' },
    Text('Holographic').font(Font.headline).foregroundColor(Color.white),
    Caption('animatedHueRotate composed with a coloured animatedGlow. Two animations, one element.'),
    HStack({ spacing: 16 },
      Card(
        'cyan halo',
        tile(220, 220, PORTRAIT)
          .colorEffect(Lib.animatedHueRotate({ duration: 4.0 }))
          .layerEffect(Lib.animatedGlow({ color: 'rgba(80, 220, 255, 0.7)', baseRadius: 3, peakRadius: 16, duration: 2.0 }))
      ),
      Card(
        'magenta halo',
        tile(220, 220, PORTRAIT)
          .colorEffect(Lib.animatedHueRotate({ duration: 6.0 }))
          .layerEffect(Lib.animatedGlow({ color: 'rgba(255, 80, 200, 0.7)', baseRadius: 3, peakRadius: 18, duration: 2.4 }))
      ),
      Card(
        'rainbow + ripple',
        tile(220, 220, PORTRAIT)
          .colorEffect(Lib.animatedHueRotate({ duration: 3.0 }))
          .distortionEffect(Lib.animatedRipple({ amplitude: 8, duration: 2.8 }), { maxSampleOffset: { width: 8, height: 8 } })
      )
    )
  );

// ─── Section 4: Pulsing neon text ───────────────────────────────────────
const NeonText = () =>
  VStack({ spacing: 18, alignment: 'leading' },
    Text('Neon Sign').font(Font.headline).foregroundColor(Color.white),
    Caption('Text driven by animatedGlow on .layerEffect — the same SVG primitives, applied to a <span> instead of an <img>.'),
    HStack({ spacing: 28 },
      Text('SHADER')
        .font(Font.largeTitle)
        .foregroundColor(Color.white)
        .layerEffect(Lib.animatedGlow({ color: 'rgba(255, 90, 200, 0.85)', baseRadius: 2, peakRadius: 16, duration: 1.6 })),
      Text('METAL')
        .font(Font.largeTitle)
        .foregroundColor(Color.white)
        .layerEffect(Lib.animatedGlow({ color: 'rgba(120, 200, 255, 0.85)', baseRadius: 2, peakRadius: 14, duration: 2.0 })),
      Text('SwiftUI')
        .font(Font.largeTitle)
        .foregroundColor(Color.white)
        .colorEffect(Lib.animatedHueRotate({ duration: 4.0 }))
        .layerEffect(Lib.animatedGlow({ color: 'rgba(160, 255, 200, 0.7)', baseRadius: 2, peakRadius: 12, duration: 2.4 }))
    )
  );

// ─── Compose the page ───────────────────────────────────────────────────
const ContentView = () =>
  VStack({ spacing: 44, alignment: 'leading' },
    Header(),
    HueWave(),
    HeatShimmer(),
    Holographic(),
    NeonText(),
    Spacer()
  );

App(ContentView).mount('#root');
