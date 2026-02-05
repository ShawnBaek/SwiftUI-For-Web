/**
 * AppViewModel - Main application state management
 *
 * Follows MVVM pattern with SwiftUI-style reactive updates using
 * ObservableObject and @Published properties.
 */

import SwiftUI from '../../../src/index.js';
const {
  ObservableObject,
  Environment, EnvironmentValues,
  UserInterfaceSizeClass, UserInterfaceIdiom, currentDeviceIdiom
} = SwiftUI;

import { api } from '../Services/api.js';

export class AppViewModel extends ObservableObject {
  constructor() {
    super();

    // Search state
    this.published('searchLocation', '');
    this.published('searchSuggestions', []);
    this.published('checkInDate', null);
    this.published('checkOutDate', null);
    this.published('guestCount', 1);

    // Filter state
    this.published('selectedCategory', 'all');
    this.published('minPrice', 0);
    this.published('maxPrice', 1000);
    this.published('selectedAmenities', []);
    this.published('instantBookOnly', false);
    this.published('superhostOnly', false);
    this.published('bedroomCount', 0);
    this.published('bedCount', 0);
    this.published('bathroomCount', 0);

    // UI state
    this.published('listings', []);
    this.published('isLoading', true);
    this.published('showFilters', false);
    this.published('showSearch', false);
    this.published('selectedListing', null);
    this.published('showBooking', false);
    this.published('currentPage', 1);
    this.published('hasMore', true);
    this.published('favorites', new Set());

    // Categories
    this.published('categories', []);

    this.init();
    this._setupEnvironmentListeners();
  }

  async init() {
    // Load categories
    const catResult = await api.getCategories();
    if (catResult.success) {
      this.categories = [{ id: 'all', name: 'All', icon: '✨' }, ...catResult.data];
    }

    // Load initial listings
    await this.loadListings();
  }

  /**
   * Setup listeners for SwiftUI-style Environment changes
   * Uses horizontalSizeClass and verticalSizeClass like SwiftUI
   * @private
   */
  _setupEnvironmentListeners() {
    // Subscribe to size class changes from Environment
    Environment.subscribe(EnvironmentValues.horizontalSizeClass, () => {
      // Trigger re-render when size class changes
      this._notifyAll();
    });
  }

  /**
   * Get the horizontal size class from Environment (matches SwiftUI @Environment(\.horizontalSizeClass))
   * @returns {string} 'compact' or 'regular'
   */
  get horizontalSizeClass() {
    return Environment.get(EnvironmentValues.horizontalSizeClass);
  }

  /**
   * Get the vertical size class from Environment (matches SwiftUI @Environment(\.verticalSizeClass))
   * @returns {string} 'compact' or 'regular'
   */
  get verticalSizeClass() {
    return Environment.get(EnvironmentValues.verticalSizeClass);
  }

  /**
   * Get current device idiom (matches SwiftUI UIDevice.current.userInterfaceIdiom)
   * @returns {string} 'phone', 'pad', or 'mac'
   */
  get deviceIdiom() {
    return currentDeviceIdiom();
  }

  /**
   * Check if in compact horizontal size class (like iPhone portrait)
   * Matches: if horizontalSizeClass == .compact
   */
  get isMobile() {
    return this.horizontalSizeClass === UserInterfaceSizeClass.compact;
  }

  /**
   * Check if in regular horizontal but device is pad
   * Matches: if horizontalSizeClass == .regular && idiom == .pad
   */
  get isTablet() {
    return this.horizontalSizeClass === UserInterfaceSizeClass.regular &&
           this.deviceIdiom === UserInterfaceIdiom.pad;
  }

  /**
   * Check if in regular horizontal and device is mac (desktop)
   * Matches: if horizontalSizeClass == .regular && idiom == .mac
   */
  get isDesktop() {
    return this.horizontalSizeClass === UserInterfaceSizeClass.regular &&
           this.deviceIdiom === UserInterfaceIdiom.mac;
  }

  /**
   * Get grid columns based on window width
   * Responsive breakpoints:
   * - Small screen (<480px): 1 card full width
   * - Tablet (480px-1023px): 2 cards per row
   * - Desktop (>=1024px): up to 8 cards per row
   */
  get gridColumns() {
    const width = window.innerWidth;

    // Small screen: 1 card full width
    if (width < 480) {
      return 1;
    }

    // Tablet: 2 cards per row
    if (width < 1024) {
      return 2;
    }

    // Desktop: more columns based on width (up to 8)
    if (width < 1440) return 4;
    if (width < 1920) return 6;
    return 8;
  }

  async loadListings(reset = true) {
    if (reset) {
      this.isLoading = true;
      this.currentPage = 1;
    }

    const params = {
      category: this.selectedCategory,
      location: this.searchLocation,
      guests: this.guestCount > 1 ? this.guestCount : undefined,
      minPrice: this.minPrice > 0 ? this.minPrice : undefined,
      maxPrice: this.maxPrice < 1000 ? this.maxPrice : undefined,
      amenities: this.selectedAmenities.length > 0 ? this.selectedAmenities : undefined,
      instantBook: this.instantBookOnly || undefined,
      superhost: this.superhostOnly || undefined,
      bedrooms: this.bedroomCount > 0 ? this.bedroomCount : undefined,
      beds: this.bedCount > 0 ? this.bedCount : undefined,
      bathrooms: this.bathroomCount > 0 ? this.bathroomCount : undefined,
      page: this.currentPage,
      limit: 20
    };

    const result = await api.getListings(params);

    if (result.success) {
      if (reset) {
        this.listings = result.data;
      } else {
        this.listings = [...this.listings, ...result.data];
      }
      this.hasMore = result.meta.hasMore;
    }

    this.isLoading = false;
  }

  async loadMore() {
    if (!this.hasMore || this.isLoading) return;
    this.currentPage++;
    await this.loadListings(false);
  }

  async selectCategory(categoryId) {
    this.selectedCategory = categoryId;
    await this.loadListings();
  }

  async applyFilters() {
    this.showFilters = false;
    await this.loadListings();
  }

  clearFilters() {
    this.minPrice = 0;
    this.maxPrice = 1000;
    this.selectedAmenities = [];
    this.instantBookOnly = false;
    this.superhostOnly = false;
    this.bedroomCount = 0;
    this.bedCount = 0;
    this.bathroomCount = 0;
  }

  toggleFavorite(listingId) {
    const newFavorites = new Set(this.favorites);
    if (newFavorites.has(listingId)) {
      newFavorites.delete(listingId);
    } else {
      newFavorites.add(listingId);
    }
    this.favorites = newFavorites;
  }

  async selectListing(listing) {
    const result = await api.getListing(listing.id);
    if (result.success) {
      this.selectedListing = result.data;
    }
  }

  closeListing() {
    this.selectedListing = null;
  }

  async searchSuggest(query) {
    if (query.length < 2) {
      this.searchSuggestions = [];
      return;
    }
    const result = await api.getSearchSuggestions(query);
    if (result.success) {
      this.searchSuggestions = result.data;
    }
  }
}

// Export singleton instance
export const vm = new AppViewModel();
export default vm;
