/**
 * StayFinder - Vacation Rental Booking App
 * A comprehensive SwiftUI-For-Web demo showcasing responsive design
 *
 * Features:
 * - Responsive layout (mobile, tablet, desktop)
 * - Search with filters
 * - Category navigation
 * - Listing grid with lazy loading
 * - Detail view with booking
 * - Animations and gestures
 *
 * Architecture:
 * - MVVM pattern with feature-based folder structure
 * - ViewModels/ - Application state management
 * - Views/ - Feature-organized view components
 * - Components/ - Reusable UI elements
 * - Services/ - API and data services
 */

// Framework import
import SwiftUI from '../../src/index.js';
const { App, VStack } = SwiftUI;

// ViewModel
import { vm } from './ViewModels/AppViewModel.js';

// Views (feature-based imports)
import { Header } from './Views/Header/index.js';
import { ListingGrid, ListingDetail } from './Views/Listing/index.js';
import { CategoryBar, FilterModal } from './Views/Filter/index.js';
import { MobileNav } from './Views/Navigation/index.js';

// =============================================================================
// Main App
// =============================================================================

/**
 * MainApp - Root application component
 *
 * Composes all feature views into the main layout.
 * Uses SwiftUI-style declarative composition.
 */
function MainApp() {
  return VStack({ spacing: 0 },
    Header(),
    CategoryBar(),
    ListingGrid(),
    MobileNav(),
    FilterModal(),
    ListingDetail()
  )
  .modifier({
    apply(el) {
      el.style.minHeight = '100vh';
    }
  });
}

// Mount the app
const app = App(MainApp).mount('#root');

// Set up reactive updates
vm.subscribe(() => {
  app.refresh();
});

// Re-render on window resize (debounced) for responsive grid
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    app.refresh();
  }, 150);
});
