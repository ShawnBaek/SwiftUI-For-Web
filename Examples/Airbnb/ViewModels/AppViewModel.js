/**
 * AppViewModel - Main application state management
 *
 * Follows MVVM pattern with SwiftUI-style reactive updates using
 * ObservableObject and @Published properties.
 */

import SwiftUI from '../../../src/index.js';
const {
  ObservableObject, Published,
  Environment, EnvironmentValues,
  UserInterfaceSizeClass, UserInterfaceIdiom, currentDeviceIdiom
} = SwiftUI;

import { api } from '../Services/api.js';

export class AppViewModel extends ObservableObject {
  // Search state
  @Published searchLocation = '';
  @Published searchSuggestions = [];
  @Published checkInDate = null;
  @Published checkOutDate = null;
  @Published guestCount = 1;

  // Filter state
  @Published selectedCategory = 'all';
  @Published minPrice = 0;
  @Published maxPrice = 1000;
  @Published selectedAmenities = [];
  @Published instantBookOnly = false;
  @Published superhostOnly = false;
  @Published bedroomCount = 0;
  @Published bedCount = 0;
  @Published bathroomCount = 0;

  // UI state
  @Published listings = [];
  @Published isLoading = true;
  @Published showFilters = false;
  @Published showSearch = false;
  @Published selectedListing = null;
  @Published showBooking = false;
  @Published currentPage = 1;
  @Published hasMore = true;
  @Published favorites = new Set();

  // Categories
  @Published categories = [];

  constructor() {
    super();
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
   * Get grid columns based on size class and device idiom
   * Similar to SwiftUI's adaptive grid with columns that adjust to available space
   */
  get gridColumns() {
    // Compact horizontal = phone-like = 1 column
    if (this.horizontalSizeClass === UserInterfaceSizeClass.compact) {
      return 1;
    }

    // Regular horizontal, check device idiom for more columns
    const width = window.innerWidth;
    if (this.deviceIdiom === UserInterfaceIdiom.pad) {
      return width >= 1024 ? 3 : 2;
    }

    // Desktop (mac idiom) - more columns based on width
    if (width < 1440) return 3;
    if (width < 1920) return 4;
    if (width < 2560) return 5;
    return 6;
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
