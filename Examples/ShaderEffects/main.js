/**
 * Shader Effects Example
 *
 * Demonstrates `.colorEffect()`, `.distortionEffect()`, `.layerEffect()` —
 * SwiftUI's iOS 17+ Metal-shader modifiers, web-side. Backed by SVG filter
 * graphs (W3C Filter Effects Module 1) so they apply to any DOM element
 * with zero extra setup.
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

// A small, public sample image (CC0).
const SAMPLE = 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=320&q=70';

const Lib = ShaderLibrary.default;

const Card = (label, view) =>
  VStack({ spacing: 8, alignment: 'center' },
    view,
    Text(label).font(Font.caption).foregroundColor(Color.gray)
  );

const ColorEffects = () =>
  VStack({ spacing: 16, alignment: 'leading' },
    Text('.colorEffect — per-pixel color').font(Font.headline),
    HStack({ spacing: 12 },
      Card('original',     Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8)),
      Card('grayscale',    Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.grayscale(1))),
      Card('sepia',        Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.sepia(1))),
      Card('invert',       Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.invert(1))),
      Card('hueRotate 90°',Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.hueRotate(90))),
      Card('saturation 2', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.saturation(2))),
      Card('brightness 1.4', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.brightness(1.4))),
      Card('contrast 1.6', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).colorEffect(Lib.contrast(1.6)))
    )
  );

const LayerEffects = () =>
  VStack({ spacing: 16, alignment: 'leading' },
    Text('.layerEffect — full layer sampling').font(Font.headline),
    HStack({ spacing: 12 },
      Card('blur 2',  Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).layerEffect(Lib.blur(2))),
      Card('blur 6',  Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).layerEffect(Lib.blur(6))),
      Card('blur 12', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).layerEffect(Lib.blur(12))),
      Card('dropShadow', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).layerEffect(Lib.dropShadow({ radius: 6, x: 0, y: 6, color: 'rgba(0,0,0,0.5)' })))
    )
  );

const DistortionEffects = () =>
  VStack({ spacing: 16, alignment: 'leading' },
    Text('.distortionEffect — per-pixel warp').font(Font.headline),
    HStack({ spacing: 12 },
      Card('ripple 5',  Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).distortionEffect(Lib.ripple({ amplitude: 5 }),  { maxSampleOffset: { width: 5, height: 5 } })),
      Card('ripple 12', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).distortionEffect(Lib.ripple({ amplitude: 12 }), { maxSampleOffset: { width: 12, height: 12 } })),
      Card('ripple 24', Image(SAMPLE).resizable().frame({ width: 120, height: 90 }).cornerRadius(8).distortionEffect(Lib.ripple({ amplitude: 24, frequency: 0.04 }), { maxSampleOffset: { width: 24, height: 24 } }))
    )
  );

const Composed = () =>
  VStack({ spacing: 16, alignment: 'leading' },
    Text('Composed — chained modifiers').font(Font.headline),
    HStack({ spacing: 12 },
      Card(
        'sepia + blur',
        Image(SAMPLE).resizable().frame({ width: 140, height: 100 }).cornerRadius(10)
          .colorEffect(Lib.sepia(1))
          .layerEffect(Lib.blur(2))
      ),
      Card(
        'hueRotate + ripple',
        Image(SAMPLE).resizable().frame({ width: 140, height: 100 }).cornerRadius(10)
          .colorEffect(Lib.hueRotate(180))
          .distortionEffect(Lib.ripple({ amplitude: 6 }), { maxSampleOffset: { width: 6, height: 6 } })
      ),
      Card(
        'grayscale + dropShadow',
        Image(SAMPLE).resizable().frame({ width: 140, height: 100 }).cornerRadius(10)
          .colorEffect(Lib.grayscale(1))
          .layerEffect(Lib.dropShadow({ radius: 10, y: 8, color: 'rgba(0,255,200,0.5)' }))
      )
    )
  );

const TextEffects = () =>
  VStack({ spacing: 16, alignment: 'leading' },
    Text('Text + shaders').font(Font.headline),
    HStack({ spacing: 16 },
      Text('Hello').font(Font.largeTitle).foregroundColor(Color.red).colorEffect(Lib.hueRotate(120)),
      Text('Blur').font(Font.largeTitle).foregroundColor(Color.white).layerEffect(Lib.blur(1.5)),
      Text('Drop').font(Font.largeTitle).foregroundColor(Color.white).layerEffect(Lib.dropShadow({ radius: 4, y: 3, color: 'rgba(255,0,128,0.8)' }))
    )
  );

const ContentView = () =>
  VStack({ spacing: 32, alignment: 'leading' },
    Text('Shader Effects').font(Font.largeTitle).foregroundColor(Color.white),
    Text('SwiftUI .colorEffect / .distortionEffect / .layerEffect — backed by SVG filter graphs.')
      .font(Font.subheadline).foregroundColor(Color.gray),
    ColorEffects(),
    LayerEffects(),
    DistortionEffects(),
    Composed(),
    TextEffects(),
    Spacer()
  );

App(ContentView).mount('#root');
