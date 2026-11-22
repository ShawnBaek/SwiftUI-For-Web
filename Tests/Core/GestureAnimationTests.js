/**
 * Gestures and animation on descriptor views, in a real browser (#48, #50):
 * real MouseEvent/WheelEvent dispatch, computed CSS transitions, clip-path
 * masks, and listener release when the app unmounts.
 */

import { describe, it, expect } from '../TestUtils.js';
import { App } from '../../src/App/App.js';
import { Text } from '../../src/View/Text.js';
import { VStack } from '../../src/Layout/Stack/VStack.js';
import { Show } from '../../src/View/ControlFlow/Show.js';
import { State } from '../../src/Data/State.js';
import { Circle } from '../../src/Shape/Shape.js';
import { flushSync } from '../../src/Core/Scheduler.js';
import { TapGesture, DragGesture, MagnificationGesture } from '../../src/Gesture/Gesture.js';
import { For } from '../../src/View/ControlFlow/For.js';
import { Animation, AnyTransition, Namespace, withAnimation } from '../../src/Animation/Animation.js';

const attachedRoot = () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
};

const mouse = (type, x, y) => new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
// Headless runs with virtual time may not produce animation frames, so the
// transition test drives frames with timers.
const timerFrames = (callback) => setTimeout(() => callback(performance.now()), 0);
const frame = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('Gestures and animation on descriptor views (browser)', () => {
  it('TapGesture and onDrag respond to real mouse events', () => {
    const root = attachedRoot();
    const taps = [];
    const drags = [];
    const app = App(() => VStack(
      Text('tap').gesture(TapGesture().onEnded(() => taps.push('tap'))),
      Text('drag').onDrag((v) => drags.push(v.translation.width), (v) => drags.push('end ' + v.translation.height))
    )).mount(root);
    try {
      const [tap, drag] = root.querySelectorAll('span');
      tap.dispatchEvent(mouse('click', 1, 1));
      drag.dispatchEvent(mouse('mousedown', 0, 0));
      document.dispatchEvent(mouse('mousemove', 25, 5));
      document.dispatchEvent(mouse('mouseup', 25, 5));
      expect(taps).toEqual(['tap']);
      expect(drags).toEqual([25, 'end 5']);
    } finally {
      app.unmount();
      root.remove();
    }
  });

  it('a ctrl+wheel pinch drives MagnificationGesture', () => {
    const root = attachedRoot();
    let scale = 1;
    const app = App(() => Text('zoom').gesture(MagnificationGesture().onChanged((v) => { scale = v.magnification; }))).mount(root);
    try {
      root.querySelector('span').dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -10 }));
      expect(Math.round(scale * 10) / 10).toBe(1.1);
    } finally {
      app.unmount();
      root.remove();
    }
  });

  it('unmounting releases gesture listeners, including the document ones', () => {
    const root = attachedRoot();
    let changes = 0;
    const app = App(() => Text('drag').gesture(DragGesture({ minimumDistance: 0 }).onChanged(() => { changes++; }))).mount(root);
    const span = root.querySelector('span');
    span.dispatchEvent(mouse('mousedown', 0, 0));
    app.unmount();
    root.remove();
    document.dispatchEvent(mouse('mousemove', 50, 50));
    document.dispatchEvent(mouse('mouseup', 50, 50));
    expect(changes).toBe(0);
  });

  it('.animation gives the element a computed CSS transition', () => {
    const root = attachedRoot();
    const app = App(() => Text('fade').opacity(0.5).animation(Animation.easeInOut(0.25))).mount(root);
    try {
      const style = getComputedStyle(root.querySelector('span'));
      expect(style.transitionDuration).toBe('0.25s');
    } finally {
      app.unmount();
      root.remove();
    }
  });

  it('.transition: a view shown inside withAnimation starts transparent and animates in', async () => {
    const root = attachedRoot();
    const shown = new State(false);
    const app = App(() => VStack(Show(() => shown.value, Text('hello').transition(AnyTransition.opacity)))).mount(root);
    const previousRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = timerFrames;
    try {
      let insertedOpacity = null;
      await withAnimation(Animation.linear(0.05), () => {
        shown.value = true;
        flushSync();
        insertedOpacity = root.querySelector('span')?.style.opacity;
      });
      expect(insertedOpacity).toBe('0');
      await frame();
      const span = root.querySelector('span');
      expect(span.style.opacity).toBe('');
      expect(getComputedStyle(span).transitionDuration).toBe('0.05s');
    } finally {
      window.requestAnimationFrame = previousRAF;
      app.unmount();
      root.remove();
    }
  });

  it('.mask(Circle()) clips with a computed clip-path; .matchedGeometryEffect names the view transition', () => {
    const root = attachedRoot();
    const ns = Namespace();
    const app = App(() => VStack(
      Text('masked').frame({ width: 40, height: 40 }).mask(Circle()),
      Text('hero').matchedGeometryEffect('hero', ns)
    )).mount(root);
    try {
      const [masked, hero] = root.querySelectorAll('span');
      expect(getComputedStyle(masked).clipPath).toBe('circle(50%)');
      expect(getComputedStyle(hero).viewTransitionName).toBe(ns.name('hero'));
    } finally {
      app.unmount();
      root.remove();
    }
  });
});

describe('Gesture arbitration (browser)', () => {
  it('a high-priority tap on a parent beats the child tap; the parent\'s simultaneous tap still fires', () => {
    const root = attachedRoot();
    const log = [];
    const app = App(() => VStack(
      Text('child')
        .gesture(TapGesture().onEnded(() => log.push('child gesture')))
        .onTapGesture(() => log.push('child onTapGesture'))
    )
      .highPriorityGesture(TapGesture().onEnded(() => log.push('parent high')))
      .simultaneousGesture(TapGesture().onEnded(() => log.push('parent simultaneous')))).mount(root);
    try {
      root.querySelector('span').dispatchEvent(mouse('click', 1, 1));
      expect(log).toEqual(['parent high', 'parent simultaneous']);
    } finally {
      app.unmount();
      root.remove();
    }
  });

  it('a high-priority drag on a parent keeps the child drag from starting', () => {
    const root = attachedRoot();
    const log = [];
    const app = App(() => VStack(
      Text('child').gesture(DragGesture({ minimumDistance: 0 }).onChanged(() => log.push('child')))
    ).highPriorityGesture(DragGesture({ minimumDistance: 0 }).onEnded((v) => log.push('parent ' + v.translation.width)))).mount(root);
    try {
      root.querySelector('span').dispatchEvent(mouse('mousedown', 0, 0));
      document.dispatchEvent(mouse('mousemove', 30, 0));
      document.dispatchEvent(mouse('mouseup', 30, 0));
      expect(log).toEqual(['parent 30']);
    } finally {
      app.unmount();
      root.remove();
    }
  });
});

describe('Removal transitions (browser)', () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  it('Show: the removed view stays for the animation, runs a Web Animation, then leaves', async () => {
    const root = attachedRoot();
    const shown = new State(true);
    const fade = AnyTransition.opacity.animation(Animation.linear(0.15));
    const app = App(() => VStack(Show(() => shown.value, Text('bye').transition(fade)))).mount(root);
    try {
      const span = root.querySelector('span');
      shown.value = false;
      flushSync();
      const seen = [span.isConnected, getComputedStyle(span).pointerEvents, span.getAnimations().length];
      await wait(60);
      seen.push(span.isConnected);
      await wait(160);
      seen.push(span.isConnected);
      expect(seen).toEqual([true, 'none', 1, true, false]);
      expect(root.querySelector('span')).toBeNull();
    } finally {
      app.unmount();
      root.remove();
    }
  });

  it('For inside withAnimation: the removed row slides out while the others stay', async () => {
    const root = attachedRoot();
    const items = new State(['a', 'b']);
    const app = App(() => VStack(For(() => items.value, (item) => Text(item).transition(AnyTransition.slide), (item) => item))).mount(root);
    const previousRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = timerFrames;
    try {
      const [rowA] = root.querySelectorAll('span');
      let lingering = null;
      const done = withAnimation(Animation.linear(0.1), () => {
        items.value = ['b'];
        flushSync();
        lingering = rowA.isConnected;
      });
      await done;
      expect(lingering).toBe(true);
      await wait(40);
      expect([...root.querySelectorAll('span')].map((s) => s.textContent)).toEqual(['b']);
    } finally {
      window.requestAnimationFrame = previousRAF;
      app.unmount();
      root.remove();
    }
  });

  it('prefers-reduced-motion removes the view at once', () => {
    const root = attachedRoot();
    const shown = new State(true);
    const fade = AnyTransition.opacity.animation(Animation.linear(0.15));
    const app = App(() => VStack(Show(() => shown.value, Text('bye').transition(fade)))).mount(root);
    const previous = window.matchMedia;
    window.matchMedia = (query) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} });
    try {
      shown.value = false;
      flushSync();
      expect(root.querySelector('span')).toBeNull();
    } finally {
      window.matchMedia = previous;
      app.unmount();
      root.remove();
    }
  });
});
