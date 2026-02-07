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
  // Environment for adaptive layout
  Environment,
  EnvironmentValues,
  UserInterfaceSizeClass
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
  .modifier({
    apply(el) {
      el.id = cardId;
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.05)';
        el.style.boxShadow = '0 8px 25px rgba(0,0,0,0.5)';
        el.style.zIndex = '10';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = 'none';
        el.style.zIndex = '1';
      });

      el.addEventListener('click', () => {
        // Get card position for animation
        const rect = el.getBoundingClientRect();
        openCard(movie, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height
        });
      });
    }
  });
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
      el.id = cardId;
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
      el.style.aspectRatio = '2/3';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.05)';
        el.style.boxShadow = '0 8px 25px rgba(0,0,0,0.5)';
        el.style.zIndex = '10';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = 'none';
        el.style.zIndex = '1';
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

    // Responsive grid container
    new View().modifier({
      apply(el) {
        el.style.display = 'grid';
        el.style.gridTemplateColumns = `repeat(${layout.gridColumns}, 1fr)`;
        el.style.gap = `${layout.gridGap}px`;
        el.style.padding = `0 ${layout.horizontalPadding}px`;

        // Render movie cards into the grid
        category.items.slice(0, layout.gridColumns).forEach(movie => {
          const cardView = MovieCardGrid(movie);
          const rendered = renderView(cardView);
          if (rendered) {
            el.appendChild(rendered);
          }
        });
      }
    })
  ).padding({ vertical: layout.isMobile ? 12 : 16 });
}

/**
 * Open card: creates overlay DOM and appends to document.body (outside view tree)
 * This avoids app.refresh() which would reset scroll position.
 */
function openCard(movie, rect) {
  // Prevent opening multiple overlays
  if (currentOverlay) return;

  selectedMovie = movie;
  currentCardRect = rect;

  const layout = getLayoutInfo();

  // Create overlay container (appended to body, not the view tree)
  const overlay = document.createElement('div');
  overlay.id = 'netflix-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    pointer-events: auto;
  `;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0);
    transition: background 0.4s ease;
  `;
  backdrop.addEventListener('click', closeCard);
  overlay.appendChild(backdrop);

  // Expanded card container
  const card = document.createElement('div');
  const startX = rect ? rect.x : window.innerWidth / 2;
  const startY = rect ? rect.y : window.innerHeight / 2;
  const startWidth = rect ? rect.width : 0;
  const startHeight = rect ? rect.height : 0;

  card.style.cssText = `
    position: absolute;
    left: ${startX}px;
    top: ${startY}px;
    width: ${startWidth}px;
    height: ${startHeight}px;
    transform: translate(-50%, -50%);
    background: #181818;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  card.id = 'expanded-card';

  // Image
  const img = document.createElement('img');
  img.src = movie.poster;
  img.style.cssText = `
    width: 100%;
    height: 70%;
    object-fit: cover;
    display: block;
  `;
  card.appendChild(img);

  // Text overlay with gradient
  const textOverlay = document.createElement('div');
  textOverlay.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to top, rgba(24, 24, 24, 1) 0%, rgba(24, 24, 24, 0.95) 40%, rgba(24, 24, 24, 0) 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 20px;
    opacity: 0;
    transition: opacity 0.3s ease 0.2s;
  `;

  // Title
  const title = document.createElement('h2');
  title.textContent = movie.title;
  title.style.cssText = `
    color: white;
    font-size: ${layout.isMobile ? '18px' : '24px'};
    font-weight: bold;
    margin: 0 0 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  textOverlay.appendChild(title);

  // Meta info
  const meta = document.createElement('div');
  meta.style.cssText = `
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 8px;
  `;
  meta.innerHTML = `
    <span style="color: #46d369; font-weight: 500;">${movie.year}</span>
    <span style="color: white; padding: 2px 6px; border: 1px solid rgba(255,255,255,0.4); border-radius: 3px; font-size: 12px;">${movie.rating}</span>
  `;
  textOverlay.appendChild(meta);

  // Description
  const desc = document.createElement('p');
  desc.textContent = movie.description || 'An exciting movie that will keep you on the edge of your seat.';
  desc.style.cssText = `
    color: rgba(255, 255, 255, 0.8);
    font-size: ${layout.isMobile ? '12px' : '14px'};
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  textOverlay.appendChild(desc);

  // Action buttons
  const buttons = document.createElement('div');
  buttons.style.cssText = `
    display: flex;
    gap: 10px;
    margin-top: 12px;
  `;
  buttons.innerHTML = `
    <button style="flex: 1; padding: 10px; background: white; color: black; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 14px;">▶ Play</button>
    <button style="padding: 10px 16px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 4px; cursor: pointer;">+ My List</button>
  `;
  textOverlay.appendChild(buttons);

  card.appendChild(textOverlay);

  // Close button (top-left)
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 12px;
    left: 12px;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.3s ease 0.3s, transform 0.3s ease 0.3s, background 0.2s ease;
    z-index: 10;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(0, 0, 0, 0.7)';
  });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeCard();
  });
  card.appendChild(closeBtn);

  overlay.appendChild(card);

  // Store reference
  currentOverlay = overlay;

  // Append to body (outside view tree)
  document.body.appendChild(overlay);

  // Animate open
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      backdrop.style.background = 'rgba(0, 0, 0, 0.85)';

      card.style.left = '50%';
      card.style.top = '50%';
      card.style.width = `${layout.expandedWidth}px`;
      card.style.height = `${layout.expandedHeight}px`;

      closeBtn.style.opacity = '1';
      closeBtn.style.transform = 'scale(1)';
      textOverlay.style.opacity = '1';
    });
  });
}

/**
 * Close card with animation back to original position.
 * Removes overlay DOM directly via transitionend — no app.refresh() needed.
 */
function closeCard() {
  if (!currentOverlay) return;

  const overlay = currentOverlay;
  const card = overlay.querySelector('#expanded-card');
  const backdrop = overlay.querySelector('div:first-child');
  const rect = currentCardRect;

  // Prevent double-close
  currentOverlay = null;
  currentCardRect = null;
  selectedMovie = null;

  if (card && rect) {
    // Animate close back to original card position
    card.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    card.style.left = `${rect.x}px`;
    card.style.top = `${rect.y}px`;
    card.style.width = `${rect.width}px`;
    card.style.height = `${rect.height}px`;
    card.style.borderRadius = '6px';
    card.style.opacity = '0.8';

    // Hide text overlay and close button
    const textOverlay = card.querySelector('div:nth-child(2)');
    const closeBtn = card.querySelector('button:last-of-type');
    if (textOverlay) {
      textOverlay.style.transition = 'opacity 0.15s ease';
      textOverlay.style.opacity = '0';
    }
    if (closeBtn) {
      closeBtn.style.transition = 'opacity 0.15s ease';
      closeBtn.style.opacity = '0';
    }

    // Fade backdrop
    if (backdrop) {
      backdrop.style.background = 'rgba(0, 0, 0, 0)';
    }

    // Remove overlay after animation completes
    const removeOverlay = () => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };

    card.addEventListener('transitionend', function handler(e) {
      // Only act on the card's own transitions (e.g. 'left', 'width')
      if (e.target === card) {
        card.removeEventListener('transitionend', handler);
        removeOverlay();
      }
    });

    // Safety fallback in case transitionend doesn't fire
    setTimeout(removeOverlay, 400);
  } else {
    // No rect info — just remove immediately
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }
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

// Debounced refresh to prevent multiple renders from rapid state changes
let refreshPending = false;
function debouncedRefresh() {
  if (refreshPending) return;
  refreshPending = true;
  requestAnimationFrame(() => {
    refreshPending = false;
    app.refresh();
  });
}

// Re-render on window resize (debounced)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    app.refresh();
  }, 150);
});

// Also subscribe to Environment changes
Environment.subscribe(EnvironmentValues.horizontalSizeClass, () => {
  app.refresh();
});

// Handle escape key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentOverlay) {
    closeCard();
  }
});

console.log('Netflix Clone initialized with Pinterest-style card expansion');
