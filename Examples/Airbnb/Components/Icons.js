/**
 * Icons - SVG icon components for Airbnb-style UI
 * Replaces emoji with proper vector icons matching Airbnb's design
 */

import SwiftUI from '../../../src/index.js';
const { View, Color } = SwiftUI;

/**
 * Base SVG Icon component
 * @param {string} svg - SVG path/content
 * @param {number} size - Icon size in pixels
 * @param {string} color - Icon color
 */
function Icon(svg, size = 24, color = 'currentColor') {
  return new View().modifier({
    apply(el) {
      el.innerHTML = svg;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.flexShrink = '0';
      const svgEl = el.querySelector('svg');
      if (svgEl) {
        svgEl.style.width = '100%';
        svgEl.style.height = '100%';
        if (color !== 'currentColor') {
          svgEl.style.color = color;
        }
      }
    }
  });
}

// =============================================================================
// Navigation & UI Icons
// =============================================================================

export const Icons = {
  // Search icon (magnifying glass)
  search: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  `, size, color),

  // Heart outline (favorite)
  heartOutline: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `, size, color),

  // Heart filled
  heartFilled: (size = 24, color = '#FF385C') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `, size, color),

  // Star (rating)
  star: (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  `, size, color),

  // Filter/sliders icon
  filter: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
      <circle cx="8" cy="6" r="2" fill="${color}"/>
      <circle cx="16" cy="12" r="2" fill="${color}"/>
      <circle cx="10" cy="18" r="2" fill="${color}"/>
    </svg>
  `, size, color),

  // Home icon
  home: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  `, size, color),

  // Map/explore icon
  explore: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  `, size, color),

  // Trips/map-pin icon
  trips: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `, size, color),

  // Message/inbox icon
  inbox: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `, size, color),

  // User/profile icon
  profile: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    </svg>
  `, size, color),

  // Close/X icon
  close: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `, size, color),

  // Plus icon
  plus: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `, size, color),

  // Minus icon
  minus: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  `, size, color),

  // Check icon
  check: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `, size, color),

  // Globe icon
  globe: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  `, size, color),

  // Menu/hamburger icon
  menu: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  `, size, color),

  // Arrow left
  arrowLeft: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  `, size, color),

  // Arrow right
  arrowRight: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  `, size, color),

  // Share icon
  share: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  `, size, color),

  // Calendar icon
  calendar: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  `, size, color),

  // Users/guests icon
  users: (size = 24, color = 'currentColor') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  `, size, color)
};

// =============================================================================
// Category Icons (replacing emoji)
// =============================================================================

export const CategoryIcons = {
  'all': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 2l2 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7L3 9h7z"/>
    </svg>
  `, size, color),

  'amazing-views': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
    </svg>
  `, size, color),

  'beach': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83"/>
      <circle cx="12" cy="12" r="4"/>
      <path d="M2 20c2-2 4-3 6-3s4 1 6 3 4 3 6 3"/>
    </svg>
  `, size, color),

  'cabins': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21h18"/>
      <path d="M5 21V7l7-4 7 4v14"/>
      <path d="M9 21v-6h6v6"/>
    </svg>
  `, size, color),

  'countryside': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 2v8M8 6l4 4 4-4"/>
      <path d="M3 21c0-4 3-7 9-7s9 3 9 7"/>
    </svg>
  `, size, color),

  'design': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  `, size, color),

  'islands': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <ellipse cx="12" cy="16" rx="8" ry="4"/>
      <path d="M12 12V6"/>
      <path d="M12 6c-2 0-4 2-4 4"/>
      <path d="M12 6c2 0 4 2 4 4"/>
    </svg>
  `, size, color),

  'lakefront': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3"/>
      <path d="M2 17c2-2 4-3 6-3s4 1 6 3 4 3 6 3"/>
      <path d="M8 3v5M16 5v3"/>
    </svg>
  `, size, color),

  'luxe': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"/>
    </svg>
  `, size, color),

  'mansions': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M3 21h18"/>
      <path d="M5 21V11l7-8 7 8v10"/>
      <path d="M9 21v-4h6v4"/>
      <path d="M9 11h.01M15 11h.01"/>
    </svg>
  `, size, color),

  'national-parks': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 3v18"/>
      <path d="M5 8c3-2 4 1 7 1s4-3 7-1"/>
      <path d="M5 14c3-2 4 1 7 1s4-3 7-1"/>
    </svg>
  `, size, color),

  'omg': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 9h.01M16 9h.01"/>
      <path d="M9 15c.83.67 1.92 1 3 1s2.17-.33 3-1"/>
    </svg>
  `, size, color),

  'pools': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3"/>
      <path d="M2 18c2-2 4-3 6-3s4 1 6 3 4 3 6 3"/>
      <circle cx="8" cy="6" r="2"/>
      <path d="M8 8v4"/>
    </svg>
  `, size, color),

  'skiing': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <circle cx="12" cy="4" r="2"/>
      <path d="M6 20l6-12M18 20l-6-12"/>
      <path d="M3 17l18 3"/>
    </svg>
  `, size, color),

  'tiny-homes': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M3 21h18"/>
      <path d="M6 21V9l6-6 6 6v12"/>
      <path d="M10 21v-4h4v4"/>
    </svg>
  `, size, color),

  'treehouses': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 22V12"/>
      <path d="M4 10c2-4 5-6 8-6s6 2 8 6"/>
      <rect x="8" y="6" width="8" height="6" rx="1"/>
    </svg>
  `, size, color),

  'trending': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 2c1 6 6 10 6 10s-11 0-11 9"/>
      <path d="M5 22h14"/>
    </svg>
  `, size, color),

  'tropical': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M12 22V10"/>
      <path d="M4 8c0-4 4-6 8-6"/>
      <path d="M20 8c0-4-4-6-8-6"/>
      <path d="M12 10c-4 0-6 2-6 6"/>
      <path d="M12 10c4 0 6 2 6 6"/>
    </svg>
  `, size, color),

  'vineyards': (size = 24, color = '#222222') => Icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
      <path d="M8 22h8"/>
      <path d="M12 11v11"/>
      <circle cx="12" cy="7" r="5"/>
      <circle cx="12" cy="5" r="2"/>
    </svg>
  `, size, color)
};

/**
 * Get category icon by ID
 * @param {string} categoryId - Category identifier
 * @param {number} size - Icon size
 * @param {string} color - Icon color
 */
export function getCategoryIcon(categoryId, size = 24, color = '#222222') {
  const iconFn = CategoryIcons[categoryId];
  if (iconFn) {
    return iconFn(size, color);
  }
  // Fallback to star icon
  return CategoryIcons['all'](size, color);
}

export default Icons;
