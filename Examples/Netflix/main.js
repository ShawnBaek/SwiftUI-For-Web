/**
 * Netflix Clone - SwiftUI for Web
 *
 * Demonstrates:
 * - Hero banner with gradient overlay (ZStack)
 * - Horizontal scrolling carousels (ScrollView)
 * - Pinterest-style card expansion animation
 * - Smooth open/close transitions
 * - Adaptive layout for mobile/tablet/desktop
 */

import {
  App,
  VStack,
  HStack,
  ZStack,
  Text,
  Image,
  Button,
  ScrollView,
  ForEach,
  Spacer,
  Color,
  Font,
  LinearGradient,
  View,
  // Animation — public SwiftUI API; GSAP runs internally
  Animation,
  withAnimation,
  // Environment for adaptive layout
  Environment,
  EnvironmentValues,
  UserInterfaceSizeClass,
  // Public reactive helper — wraps a closure in a tracked effect so it
  // re-runs when any signal it reads changes.
  effect,
} from '../../src/index.js';

import { VIEW_DESCRIPTOR } from '../../src/Core/ViewDescriptor.js';
import { render as renderDescriptor } from '../../src/Core/Renderer.js';

/**
 * Helper function to render either a descriptor or a legacy View
 */
function renderView(view) {
  if (view && view.$$typeof === VIEW_DESCRIPTOR) {
    return renderDescriptor(view);
  } else if (view && typeof view._render === 'function') {
    return view._render();
  }
  return null;
}

// =============================================================================
// Sample Data (using placeholder images)
// =============================================================================

const PLACEHOLDER_BASE = 'https://picsum.photos/seed';

const featuredMovie = {
  id: 'featured-1',
  title: 'Stranger Things',
  description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
  backdrop: `${PLACEHOLDER_BASE}/stranger/1280/720`,
  poster: `${PLACEHOLDER_BASE}/stranger/300/450`,
  year: 2024,
  rating: 'TV-14',
  duration: '4 Seasons'
};

const categories = [
  {
    title: 'Trending Now',
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `trending-${i}`,
      title: `Trending Movie ${i + 1}`,
      description: 'An exciting adventure that will keep you on the edge of your seat with stunning visuals and compelling storytelling.',
      poster: `${PLACEHOLDER_BASE}/trending${i}/300/450`,
      year: 2024 - Math.floor(Math.random() * 5),
      rating: ['PG', 'PG-13', 'R'][Math.floor(Math.random() * 3)]
    }))
  },
  {
    title: 'Popular on Netflix',
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `popular-${i}`,
      title: `Popular Show ${i + 1}`,
      description: 'A critically acclaimed series that has captivated audiences worldwide with its gripping narrative.',
      poster: `${PLACEHOLDER_BASE}/popular${i}/300/450`,
      year: 2024 - Math.floor(Math.random() * 3),
      rating: ['TV-14', 'TV-MA', 'TV-PG'][Math.floor(Math.random() * 3)]
    }))
  },
  {
    title: 'New Releases',
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `new-${i}`,
      title: `New Release ${i + 1}`,
      description: 'Fresh content just added to our library, featuring the latest and greatest in entertainment.',
      poster: `${PLACEHOLDER_BASE}/new${i}/300/450`,
      year: 2024,
      rating: ['PG', 'PG-13', 'R', 'TV-MA'][Math.floor(Math.random() * 4)]
    }))
  },
  {
    title: 'Action & Adventure',
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `action-${i}`,
      title: `Action Movie ${i + 1}`,
      description: 'High-octane thrills and explosive action sequences that will leave you breathless.',
      poster: `${PLACEHOLDER_BASE}/action${i}/300/450`,
      year: 2024 - Math.floor(Math.random() * 10),
      rating: ['PG-13', 'R'][Math.floor(Math.random() * 2)]
    }))
  },
  {
    title: 'Documentaries',
    items: Array.from({ length: 10 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Documentary ${i + 1}`,
      description: 'Thought-provoking documentary that explores fascinating subjects and real-world stories.',
      poster: `${PLACEHOLDER_BASE}/doc${i}/300/450`,
      year: 2024 - Math.floor(Math.random() * 5),
      rating: ['TV-G', 'TV-PG', 'TV-14'][Math.floor(Math.random() * 3)]
    }))
  }
];

// =============================================================================
// State
// =============================================================================

// Overlay is managed outside the view tree to avoid scroll reset on app.refresh()
let selectedMovie = null;   // Currently selected movie (plain variable, not State)
let currentOverlay = null;  // Reference to the overlay DOM element
let currentCardRect = null; // Stored rect of the clicked card for close animation

// =============================================================================
// Responsive Helpers
// =============================================================================

function getLayoutInfo() {
  const horizontalSizeClass = Environment.get(EnvironmentValues.horizontalSizeClass);
  const isMobile = horizontalSizeClass === UserInterfaceSizeClass.compact;
  const width = window.innerWidth;

  // Calculate responsive columns for grid layout
  // Small screen (<480px): 1 card full width
  // Tablet (480px-1023px): 2 cards per row
  // Desktop (>=1024px): up to 8 cards per row
  let gridColumns;
  if (width < 480) {
    gridColumns = 1;
  } else if (width < 1024) {
    gridColumns = 2;
  } else if (width < 1440) {
    gridColumns = 4;
  } else if (width < 1920) {
    gridColumns = 6;
  } else {
    gridColumns = 8;
  }

  // Card dimensions maintain 2:3 aspect ratio
  const horizontalPadding = isMobile ? 16 : (width < 1024 ? 32 : 48);
  const gridGap = isMobile ? 8 : 12;
  const availableWidth = width - (horizontalPadding * 2) - (gridGap * (gridColumns - 1));
  const gridCardWidth = Math.floor(availableWidth / gridColumns);
  const gridCardHeight = Math.floor(gridCardWidth * 1.5); // 2:3 aspect ratio

  return {
    isMobile,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    horizontalSizeClass,
    // Original carousel card sizes
    cardWidth: isMobile ? 120 : (width < 1024 ? 150 : 180),
    cardHeight: isMobile ? 180 : (width < 1024 ? 225 : 270),
    // Grid layout sizes
    gridColumns,
    gridCardWidth,
    gridCardHeight,
    gridGap,
    heroHeight: isMobile ? 400 : (width < 1024 ? 500 : 600),
    horizontalPadding,
    // Expanded card size
    expandedWidth: isMobile ? Math.min(width - 40, 340) : Math.min(width * 0.5, 500),
    expandedHeight: isMobile ? Math.min(window.innerHeight - 100, 500) : Math.min(window.innerHeight - 100, 700)
  };
}

// =============================================================================
// Components
// =============================================================================

/**
 * Navigation Bar
 */
function NavBar() {
  const layout = getLayoutInfo();

  if (layout.isMobile) {
    return HStack({ spacing: 16 },
      Text('NETFLIX')
        .font(Font.system(24, 'bold'))
        .foregroundColor(Color.hex('#E50914')),
      Spacer(),
      new View().modifier({
        apply(el) {
          el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
          el.style.cursor = 'pointer';
        }
      })
    )
    .padding({ horizontal: 16, vertical: 12 })
    .background('rgba(20, 20, 20, 0.95)');
  }

  return HStack({ spacing: 24 },
    Text('NETFLIX')
      .font(Font.system(28, 'bold'))
      .foregroundColor(Color.hex('#E50914')),
    layout.isDesktop ? HStack({ spacing: 16 },
      Text('Home').foregroundColor('white'),
      Text('TV Shows').foregroundColor(Color.gray),
      Text('Movies').foregroundColor(Color.gray),
      Text('New & Popular').foregroundColor(Color.gray)
    ) : null,
    Spacer(),
    HStack({ spacing: 16 },
      new View().modifier({
        apply(el) {
          el.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
          el.style.cursor = 'pointer';
        }
      }),
      new View().modifier({
        apply(el) {
          el.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
          el.style.cursor = 'pointer';
        }
      })
    )
  )
  .padding({ horizontal: layout.horizontalPadding, vertical: 16 })
  .background('rgba(20, 20, 20, 0.9)');
}

/**
 * Hero Banner
 */
function HeroBanner(movie) {
  const layout = getLayoutInfo();

  return ZStack({ alignment: 'bottomLeading' },
    Image(movie.backdrop)
      .resizable()
      .aspectRatio('fill')
      .frame({ height: layout.heroHeight }),

    LinearGradient(
      ['transparent', 'rgba(20, 20, 20, 0.4)', 'rgba(20, 20, 20, 0.9)', '#141414'],
      { direction: 'to bottom' }
    ).frame({ height: layout.heroHeight }),

    VStack({ alignment: 'leading', spacing: layout.isMobile ? 12 : 16 },
      Text(movie.title)
        .font(Font.system(layout.isMobile ? 32 : 56, 'bold'))
        .foregroundColor('white'),

      HStack({ spacing: 12 },
        Text(movie.rating)
          .font(Font.caption)
          .foregroundColor('white')
          .padding({ horizontal: 8, vertical: 4 })
          .border('white', 1)
          .cornerRadius(4),
        Text(movie.year).font(Font.body).foregroundColor(Color.gray),
        Text(movie.duration).font(Font.body).foregroundColor(Color.gray)
      ),

      !layout.isMobile ? Text(movie.description)
        .font(Font.body)
        .foregroundColor('white')
        .frame({ maxWidth: 600 })
        .opacity(0.9) : null,

      HStack({ spacing: 12 },
        Button('▶ Play', () => {})
          .padding({ horizontal: 32, vertical: 12 })
          .background('white')
          .foregroundColor('black')
          .font(Font.system(16, 'bold'))
          .cornerRadius(4),
        Button('ℹ More Info', () => {
          openCard(movie, { x: window.innerWidth / 2, y: window.innerHeight / 2, width: 0, height: 0 });
        })
        .padding({ horizontal: 24, vertical: 12 })
        .background('rgba(109, 109, 110, 0.7)')
        .foregroundColor('white')
        .font(Font.system(16, 'bold'))
        .cornerRadius(4)
      ).padding({ top: 8 })
    )
    .padding({ left: layout.horizontalPadding, right: layout.horizontalPadding, bottom: layout.isMobile ? 40 : 80 })
  ).frame({ height: layout.heroHeight });
}

/**
 * Movie Card with Pinterest-style tap animation
 */
function MovieCard(movie) {
  const layout = getLayoutInfo();
  const cardId = `card-${movie.id}`;

  return VStack({ spacing: 0 },
    Image(movie.poster)
      .resizable()
      .aspectRatio('fill')
      .frame({ width: layout.cardWidth, height: layout.cardHeight })
      .cornerRadius(6)
  )
  .modifier({ apply: (el) => wireCardInteractions(el, cardId, movie) });
}

/**
 * Movie Card for Grid Layout (responsive sizing)
 */
function MovieCardGrid(movie) {
  const layout = getLayoutInfo();
  const cardId = `card-grid-${movie.id}`;

  return VStack({ spacing: 0 },
    Image(movie.poster)
      .resizable()
      .aspectRatio('fill')
      .frame({ width: '100%', height: layout.gridCardHeight })
      .cornerRadius(6)
  )
  .modifier({
    apply(el) {
      el.style.aspectRatio = '2/3';
      wireCardInteractions(el, cardId, movie);
    }
  });
}

/**
 * Card interaction wiring — hover scale + click → openCard.
 *
 * Perf design:
 *   • transform-only transition (compositor thread)
 *   • NO box-shadow change on hover — 25px-radius blur paints are
 *     expensive on every enter/leave and the prior version was the
 *     dominant paint cost during a hover sweep across a row of 8 cards.
 *     Cards already lift via the scale; the lack of shadow is barely
 *     perceptible and the smoothness gain is large.
 *   • `will-change: transform` is added *on enter* and dropped on the
 *     transition's end. Permanent will-change pins a GPU layer for every
 *     card on screen (30+ layers in this demo); transient promotion
 *     gives the same animation smoothness with one layer at a time.
 *   • All hover writes happen in a single rAF tick so they batch into
 *     one style recalc + composite, not three.
 *   • Image children get `decoding="async" loading="lazy"` so first-paint
 *     image decode runs off the main thread.
 */
function wireCardInteractions(el, cardId, movie) {
  el.id = cardId;
  el.style.cursor = 'pointer';
  el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';

  // Off-main-thread image decode for all <img> descendants (poster).
  for (const img of el.querySelectorAll('img')) {
    if (!img.hasAttribute('decoding')) img.decoding = 'async';
    if (!img.hasAttribute('loading'))  img.loading  = 'lazy';
  }

  let raf = 0;
  el.addEventListener('mouseenter', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.willChange = 'transform';
      el.style.transform = 'scale(1.05)';
      el.style.zIndex = '10';
    });
  });

  el.addEventListener('mouseleave', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.transform = 'scale(1)';
      // Hand off z-index AFTER the transform animation, so the lifted card
      // stays above its neighbours through the entire scale-down.
      const onEnd = () => {
        el.style.zIndex = '1';
        el.style.willChange = 'auto';
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
    });
  });

  el.addEventListener('click', () => {
    const rect = el.getBoundingClientRect();
    openCard(movie, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    });
  });
}

/**
 * Movie Row - Responsive Grid Layout
 * - Small screen: 1 card full width
 * - Tablet: 2-4 cards per row
 * - Desktop: up to 8 cards per row
 */
function MovieRow(category) {
  const layout = getLayoutInfo();

  return VStack({ alignment: 'leading', spacing: 12 },
    Text(category.title)
      .font(Font.system(layout.isMobile ? 16 : 20, 'bold'))
      .foregroundColor('white')
      .padding({ left: layout.horizontalPadding }),

    // Responsive grid container — reactive on viewport size class.
    // Wraps the layout-derived style + child mount in `effect()` so that
    // when the window resizes (and Environment.horizontalSizeClass changes)
    // the grid re-templates and re-renders its visible cards.
    new View().modifier({
      apply(el) {
        el.style.display = 'grid';
        effect(() => {
          // Subscribe to the size-class signal so this re-runs on resize.
          Environment.get(EnvironmentValues.horizontalSizeClass);
          // Re-derive layout from the now-current viewport.
          const live = getLayoutInfo();
          el.style.gridTemplateColumns = `repeat(${live.gridColumns}, 1fr)`;
          el.style.gap = `${live.gridGap}px`;
          el.style.padding = `0 ${live.horizontalPadding}px`;
          // Replace card children — count depends on gridColumns.
          el.replaceChildren();
          category.items.slice(0, live.gridColumns).forEach(movie => {
            const cardView = MovieCardGrid(movie);
            const rendered = renderView(cardView);
            if (rendered) el.appendChild(rendered);
          });
        });
      }
    })
  ).padding({ vertical: layout.isMobile ? 12 : 16 });
}

// ─────────────────────────────────────────────────────────────────────────
// Prewarmed overlay
//
// The previous version built the entire overlay DOM (~10 elements with
// styled children + innerHTML) inside the click handler, then waited two
// requestAnimationFrames before flipping to the final transform. Profile
// showed ~100ms of DOM/layout work in the click handler plus ~33ms of
// rAF wait BEFORE the 260ms transition even started — total click-to-
// settled around 400ms even though the animation itself was 60fps.
//
// New scheme:
//   1. Build the overlay tree ONCE on first open. Cache element refs.
//   2. Subsequent opens just update content (title, image, etc.), set
//      the initial transform, force a reflow to commit it, then write
//      the final transform — transition fires on the very next frame.
//   3. Close hides via `display: none` instead of removing nodes, so a
//      re-open is allocation-free.
//
// This drops click-to-animation-start from ~130ms (DOM build + 2× rAF)
// to ~one frame (~8ms) after the first open. Combined with snappier
// durations and curves, the modal now feels like a tap, not a load.
// ─────────────────────────────────────────────────────────────────────────

const OPEN_DURATION_MS = 220;
const CLOSE_DURATION_MS = 180;
// Apple UIKit-style ease-out — fast start, smooth settle, no slow tail.
const OPEN_CURVE = 'cubic-bezier(0.32, 0.72, 0, 1)';
// Slight ease-in for dismissal — hangs briefly then accelerates away.
const CLOSE_CURVE = 'cubic-bezier(0.4, 0, 1, 0.6)';

// Track in-flight animations so we can kill them mid-flight on rapid
// open/close toggles instead of stacking. Animation.animate() returns a
// GSAP Tween (.kill()) or a WAAPI Animation (.cancel()) depending on
// whether the internal engine has finished loading; we try both.
let activeAnims = [];
function cancelActiveAnims() {
  for (const a of activeAnims) {
    if (!a) continue;
    try { if (typeof a.kill === 'function') a.kill(); } catch (_) {}
    try { if (typeof a.cancel === 'function') a.cancel(); } catch (_) {}
  }
  activeAnims = [];
}

let overlayRefs = null;  // { overlay, backdrop, card, img, title, meta, desc, closeBtn, textOverlay }

function ensureOverlay() {
  if (overlayRefs) return overlayRefs;

  // Stay `display:block` from the start with `visibility:hidden` +
  // `pointer-events:none`, instead of toggling `display:none↔block`. That
  // toggle on first open is a discrete layout pass; under 4× CPU throttle
  // it was the one remaining ~25ms dropped frame in the open sequence.
  // Visibility flip is free — the element is already laid out.
  const overlay = document.createElement('div');
  overlay.id = 'netflix-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 1000;
    visibility: hidden; pointer-events: none;
  `;

  // No CSS transitions on the animated properties — WAAPI drives them
  // directly (no reflow, no transition swap, no rAF dance).
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: absolute; inset: 0;
    background: rgba(0, 0, 0, 0.85);
    opacity: 0; will-change: opacity;
  `;
  backdrop.addEventListener('click', closeCard);
  overlay.appendChild(backdrop);

  const card = document.createElement('div');
  card.id = 'expanded-card';
  card.style.cssText = `
    position: absolute; top: 50%; left: 50%;
    background: #181818;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.6);
    will-change: transform;
    contain: layout paint;
    transform: translate(-50%, -50%);
  `;

  const img = document.createElement('img');
  img.decoding = 'async';
  img.loading = 'eager';
  img.style.cssText = 'width: 100%; height: 70%; object-fit: cover; display: block;';
  card.appendChild(img);

  const textOverlay = document.createElement('div');
  textOverlay.style.cssText = `
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 50%;
    background: linear-gradient(to top, rgba(24, 24, 24, 1) 0%, rgba(24, 24, 24, 0.95) 40%, rgba(24, 24, 24, 0) 100%);
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 20px;
    opacity: 0;
  `;

  const title = document.createElement('h2');
  title.style.cssText = `
    color: white; font-weight: bold; margin: 0 0 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  textOverlay.appendChild(title);

  const meta = document.createElement('div');
  meta.style.cssText = 'display: flex; gap: 12px; align-items: center; margin-bottom: 8px;';
  textOverlay.appendChild(meta);

  const desc = document.createElement('p');
  desc.style.cssText = `
    color: rgba(255, 255, 255, 0.8); margin: 0; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  textOverlay.appendChild(desc);

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display: flex; gap: 10px; margin-top: 12px;';
  buttons.innerHTML = `
    <button style="flex: 1; padding: 10px; background: white; color: black; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px;">▶ Play</button>
    <button style="padding: 10px 16px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 4px; cursor: pointer;">+ My List</button>
  `;
  textOverlay.appendChild(buttons);

  card.appendChild(textOverlay);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute; top: 12px; left: 12px;
    width: 36px; height: 36px;
    background: rgba(0, 0, 0, 0.7); color: white;
    border: none; border-radius: 50%;
    font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transform: scale(0.8);
    transition: background 0.15s ease;
    z-index: 10;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(0, 0, 0, 0.7)';
  });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeCard(); });
  card.appendChild(closeBtn);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlayRefs = { overlay, backdrop, card, img, title, meta, desc, textOverlay, closeBtn };
  return overlayRefs;
}

/**
 * Open the prewarmed overlay with this movie's content using the Web
 * Animations API.
 *
 * Why WAAPI not CSS transitions:
 *   • `Element.animate()` lets us declare "go from state A to state B
 *     over T ms with curve C" without ever putting A on the element.
 *     The browser handles the starting state internally on the next
 *     compositor frame — no need to set the initial transform on the
 *     element and then immediately change it (which forces a sync
 *     reflow if you want the transition to actually fire).
 *   • That synchronous reflow was the 33ms dropped frame on click.
 *     WAAPI eliminates it: the click handler returns in <1ms after
 *     scheduling four short animations, and the first compositor frame
 *     after that already shows motion.
 *
 * We also defer the meta.innerHTML update to a microtask — it's the
 * only DOM-mutating operation in the path and it doesn't affect the
 * first animation frame (the meta row is inside textOverlay which
 * starts at opacity:0).
 */
function openCard(movie, rect) {
  if (currentOverlay) return;

  selectedMovie = movie;
  currentCardRect = rect;

  const layout = getLayoutInfo();
  const refs = ensureOverlay();
  const { overlay, backdrop, card, img, title, meta, desc, textOverlay, closeBtn } = refs;

  // Light content writes — these only affect the initial visible state,
  // which is hidden behind the thumbnail-sized card during the first frame.
  img.src = movie.poster;
  title.textContent = movie.title;
  title.style.fontSize = layout.isMobile ? '18px' : '24px';
  desc.textContent = movie.description || 'An exciting movie that will keep you on the edge of your seat.';
  desc.style.fontSize = layout.isMobile ? '12px' : '14px';
  card.style.width = `${layout.expandedWidth}px`;
  card.style.height = `${layout.expandedHeight}px`;

  // Compute initial (thumbnail-space) transform.
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const startX = rect ? rect.x : vpW / 2;
  const startY = rect ? rect.y : vpH / 2;
  const startWidth = rect ? rect.width : layout.expandedWidth;
  const initScale = startWidth / layout.expandedWidth;
  const dx = startX - vpW / 2;
  const dy = startY - vpH / 2;
  const initialTransform =
    `translate(-50%, -50%) translate3d(${dx}px, ${dy}px, 0) scale(${initScale})`;
  const finalTransform = 'translate(-50%, -50%) scale(1)';
  card._initialTransform = initialTransform;
  card._finalTransform   = finalTransform;

  cancelActiveAnims();
  overlay.style.visibility = 'visible';
  overlay.style.pointerEvents = 'auto';

  // Animate open: four elements coordinated via Animation.animate(),
  // which routes through Animator.js (GSAP when loaded, WAAPI fallback).
  // No direct GSAP/Animator import — the public SwiftUI animation API
  // handles the engine choice transparently.
  const openDurSec = OPEN_DURATION_MS / 1000;
  activeAnims = [
    Animation.easeOut(openDurSec).animate(
      card, { transform: initialTransform }, { transform: finalTransform }
    ),
    Animation.easeOut(openDurSec).animate(
      backdrop, { opacity: 0 }, { opacity: 1 }
    ),
    Animation.easeOut(0.16).delay(0.06).animate(
      textOverlay, { opacity: 0 }, { opacity: 1 }
    ),
    Animation.easeOut(0.16).delay(0.10).animate(
      closeBtn, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }
    ),
  ];

  // Defer the only DOM-mutating write to a microtask, so it doesn't add
  // to the click handler's frame budget. The meta row lives inside the
  // textOverlay which is still invisible at this point.
  queueMicrotask(() => {
    meta.innerHTML = `
      <span style="color: #46d369; font-weight: 500;">${movie.year}</span>
      <span style="color: white; padding: 2px 6px; border: 1px solid rgba(255,255,255,0.4); border-radius: 3px; font-size: 12px;">${movie.rating}</span>
    `;
  });

  currentOverlay = overlay;
}

/**
 * Animate the overlay closed via WAAPI and hide via `display: none`.
 * DOM stays intact and is reused by the next open() — keeps re-opens
 * allocation-free.
 */
function closeCard() {
  if (!currentOverlay || !overlayRefs) return;

  const { overlay, backdrop, card, textOverlay, closeBtn } = overlayRefs;
  const rect = currentCardRect;

  // Prevent double-close
  currentOverlay = null;
  currentCardRect = null;
  selectedMovie = null;

  const finishHide = () => {
    overlay.style.visibility = 'hidden';
    overlay.style.pointerEvents = 'none';
  };

  if (!rect) {
    finishHide();
    return;
  }

  cancelActiveAnims();

  const initialTransform = card._initialTransform || 'translate(-50%, -50%)';
  const finalTransform   = card._finalTransform   || 'translate(-50%, -50%) scale(1)';
  const closeDurSec = CLOSE_DURATION_MS / 1000;

  // Animate close: reverse of open.  We know the post-open state so we
  // can specify explicit from→to for each element.  onComplete on the
  // card tween (the longest) fires finishHide to flip visibility back.
  activeAnims = [
    Animation.easeIn(closeDurSec).animate(
      card,
      { transform: finalTransform, opacity: 1 },
      { transform: initialTransform, opacity: 0.85 },
      { onComplete: finishHide }
    ),
    Animation.easeOut(closeDurSec).animate(
      backdrop, { opacity: 1 }, { opacity: 0 }
    ),
    Animation.easeOut(0.12).animate(
      textOverlay, { opacity: 1 }, { opacity: 0 }
    ),
    Animation.easeOut(0.12).animate(
      closeBtn, { opacity: 1 }, { opacity: 0 }
    ),
  ];

  // Safety fallback in case onComplete doesn't fire (e.g. tab backgrounded).
  setTimeout(finishHide, CLOSE_DURATION_MS + 80);
}

/**
 * Home View
 */
function HomeView() {
  return VStack({ spacing: 0 },
    HeroBanner(featuredMovie),
    VStack({ spacing: 0 },
      ForEach(categories, { id: 'title' }, (category) => MovieRow(category))
    ).padding({ top: 20 })
  );
}

/**
 * Main App View
 */
function NetflixApp() {
  // Overlay is managed outside the view tree (appended to document.body)
  // so that app.refresh() doesn't destroy it or reset scroll position
  return VStack({ spacing: 0 },
    NavBar(),
    ScrollView({ showsIndicators: false },
      HomeView()
    ).modifier({
      apply(el) {
        el.style.height = 'calc(100vh - 60px)';
      }
    })
  );
}

// =============================================================================
// App Initialization
// =============================================================================

const app = App(() => NetflixApp());
app.mount('#root');

// Prewarm during browser idle: build the overlay DOM so the first open
// is allocation-free.  The GSAP animation engine prewarms automatically
// when Animation.js is imported (Animator.js self-prewarms on module
// load), so no explicit engine prewarm is needed here.
const prewarm = () => ensureOverlay();
if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(prewarm, { timeout: 1500 });
} else {
  setTimeout(prewarm, 800);
}

// Scroll-preserving refresh: save scrollTop before refresh, restore after
function refreshPreservingScroll() {
  const scrollEl = document.querySelector('[data-swiftui-mounted="true"] [style*="overflow"]');
  const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  app.refresh();
  if (scrollTop > 0) {
    const newScrollEl = document.querySelector('[data-swiftui-mounted="true"] [style*="overflow"]');
    if (newScrollEl) newScrollEl.scrollTop = scrollTop;
  }
}

// Re-render on window resize (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    refreshPreservingScroll();
  }, 150);
});

// Also subscribe to Environment changes
Environment.subscribe(EnvironmentValues.horizontalSizeClass, () => {
  refreshPreservingScroll();
});

// Handle escape key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentOverlay) {
    closeCard();
  }
});

console.log('Netflix Clone initialized with Pinterest-style card expansion');
