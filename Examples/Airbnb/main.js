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
 */

// Simple import - just one line!
import SwiftUI from '../../src/index.js';

// Destructure what you need
const {
  App, ObservableObject, Published,
  VStack, HStack, ZStack, Spacer, Divider,
  Text, Button, TextField, Toggle, Slider, Stepper,
  ScrollView, LazyVGrid, GridItem, ForEach,
  NavigationSplitView, ViewThatFits,
  Form, Section,
  Rectangle, RoundedRectangle, Circle, Capsule,
  Color, Font, LinearGradient,
  withAnimation,
  GeometryReader,
  Environment, EnvironmentValues,
  UserInterfaceSizeClass, UserInterfaceIdiom, currentDeviceIdiom
} = SwiftUI;

import { api, categories, amenitiesList, propertyTypes } from './mockApi.js';

// =============================================================================
// App State (ViewModel)
// =============================================================================

class AppViewModel extends ObservableObject {
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

// Global view model instance
const vm = new AppViewModel();

// =============================================================================
// Components
// =============================================================================

/**
 * SwiftUI-style Adaptive Layout Pattern
 *
 * This app demonstrates SwiftUI's approach to adaptive layouts using:
 *
 * 1. @Environment(\.horizontalSizeClass) - Detect compact vs regular width
 *    - compact: Phone-like width (< 768px)
 *    - regular: Tablet/Desktop width (>= 768px)
 *
 * 2. @Environment(\.verticalSizeClass) - Detect compact vs regular height
 *    - compact: Landscape phone-like height (< 480px)
 *    - regular: Portrait or larger height (>= 480px)
 *
 * 3. UserInterfaceIdiom - Device type detection
 *    - phone: Mobile devices (< 768px)
 *    - pad: Tablet devices (768px - 1024px)
 *    - mac: Desktop devices (> 1024px)
 *
 * 4. ViewThatFits - Automatically select the best fitting layout
 *
 * 5. NavigationSplitView - Adaptive sidebar/detail layout
 *
 * Layout Decision Tree (like SwiftUI):
 * - horizontalSizeClass == .compact -> Mobile layout (single column)
 * - horizontalSizeClass == .regular && idiom == .pad -> Tablet layout (2 columns)
 * - horizontalSizeClass == .regular && idiom == .mac -> Desktop layout (4-6 columns)
 */

// Logo Component
function Logo() {
  return HStack({ spacing: 8 },
    Text('🏠').font(Font.system(28)),
    Text('StayFinder')
      .font(Font.system(20, Font.Weight.bold))
      .foregroundColor(Color.hex('#FF385C'))
  );
}

// Search Bar Component (Desktop)
function SearchBarDesktop() {
  return HStack({ spacing: 0 },
    // Location
    Button(
      VStack({ alignment: 'leading', spacing: 2 },
        Text('Where')
          .font(Font.system(12, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Text(vm.searchLocation || 'Search destinations')
          .font(Font.system(14))
          .foregroundColor(vm.searchLocation ? Color.hex('#222222') : Color.hex('#717171'))
      )
      .padding({ horizontal: 24, vertical: 14 }),
      () => { vm.showSearch = true; }
    )
    .modifier({
      apply(el) {
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.cursor = 'pointer';
        el.style.textAlign = 'left';
      }
    }),

    // Divider
    Rectangle()
      .fill(Color.hex('#DDDDDD'))
      .frame({ width: 1, height: 32 }),

    // Check in
    Button(
      VStack({ alignment: 'leading', spacing: 2 },
        Text('Check in')
          .font(Font.system(12, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Text('Add dates')
          .font(Font.system(14))
          .foregroundColor(Color.hex('#717171'))
      )
      .padding({ horizontal: 24, vertical: 14 }),
      () => {}
    )
    .modifier({
      apply(el) {
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.cursor = 'pointer';
        el.style.textAlign = 'left';
      }
    }),

    // Divider
    Rectangle()
      .fill(Color.hex('#DDDDDD'))
      .frame({ width: 1, height: 32 }),

    // Check out
    Button(
      VStack({ alignment: 'leading', spacing: 2 },
        Text('Check out')
          .font(Font.system(12, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Text('Add dates')
          .font(Font.system(14))
          .foregroundColor(Color.hex('#717171'))
      )
      .padding({ horizontal: 24, vertical: 14 }),
      () => {}
    )
    .modifier({
      apply(el) {
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.cursor = 'pointer';
        el.style.textAlign = 'left';
      }
    }),

    // Divider
    Rectangle()
      .fill(Color.hex('#DDDDDD'))
      .frame({ width: 1, height: 32 }),

    // Guests
    HStack({ spacing: 8 },
      VStack({ alignment: 'leading', spacing: 2 },
        Text('Who')
          .font(Font.system(12, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Text(vm.guestCount > 1 ? `${vm.guestCount} guests` : 'Add guests')
          .font(Font.system(14))
          .foregroundColor(vm.guestCount > 1 ? Color.hex('#222222') : Color.hex('#717171'))
      ),
      Spacer(),
      // Search button
      Circle()
        .fill(Color.hex('#FF385C'))
        .frame({ width: 48, height: 48 })
        .modifier({
          apply(el) {
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.cursor = 'pointer';
            el.innerHTML = `<span style="color: white; font-size: 20px;">🔍</span>`;
          }
        })
    )
    .padding({ left: 24, right: 8, vertical: 8 })
  )
  .modifier({
    apply(el) {
      el.style.background = 'white';
      el.style.borderRadius = '40px';
      el.style.border = '1px solid #DDDDDD';
      el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)';
      el.style.transition = 'box-shadow 0.2s ease';
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)';
      });
    }
  });
}

// Search Bar Component (Mobile)
function SearchBarMobile() {
  return Button(
    HStack({ spacing: 16 },
      Circle()
        .fill(Color.clear)
        .frame({ width: 32, height: 32 })
        .modifier({
          apply(el) {
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.innerHTML = `<span style="font-size: 18px;">🔍</span>`;
          }
        }),
      VStack({ alignment: 'leading', spacing: 2 },
        Text('Where to?')
          .font(Font.system(14, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Text('Anywhere · Any week · Add guests')
          .font(Font.system(12))
          .foregroundColor(Color.hex('#717171'))
      ),
      Spacer()
    )
    .padding({ horizontal: 16, vertical: 12 }),
    () => { vm.showSearch = true; }
  )
  .modifier({
    apply(el) {
      el.style.width = '100%';
      el.style.background = 'white';
      el.style.borderRadius = '40px';
      el.style.border = '1px solid #DDDDDD';
      el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
      el.style.cursor = 'pointer';
    }
  });
}

/**
 * Adaptive Search Bar - Uses ViewThatFits pattern like SwiftUI
 *
 * SwiftUI equivalent:
 * ```swift
 * ViewThatFits(in: .horizontal) {
 *   SearchBarDesktop()  // Shown when space is available
 *   SearchBarMobile()   // Fallback for compact width
 * }
 * ```
 *
 * This component automatically selects the appropriate search bar
 * based on available horizontal space, just like SwiftUI's ViewThatFits.
 */
function AdaptiveSearchBar() {
  return ViewThatFits({ in: 'horizontal' },
    // Wide layout - Desktop search bar with full options
    SearchBarDesktop(),
    // Compact layout - Mobile search bar
    SearchBarMobile()
  );
}

/**
 * Adaptive Header Actions - Right side of header
 * Only shown when horizontal size class is regular (tablet/desktop)
 */
function HeaderActions() {
  // Only render on regular horizontal size class
  if (vm.horizontalSizeClass === UserInterfaceSizeClass.compact) {
    return null;
  }

  return HStack({ spacing: 8 },
    Button(
      Text('Become a Host')
        .font(Font.system(14, Font.Weight.medium))
        .foregroundColor(Color.hex('#222222')),
      () => {}
    )
    .modifier({
      apply(el) {
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.padding = '10px 12px';
        el.style.borderRadius = '22px';
        el.style.cursor = 'pointer';
        el.style.transition = 'background-color 0.2s';
        el.addEventListener('mouseenter', () => {
          el.style.backgroundColor = '#F7F7F7';
        });
        el.addEventListener('mouseleave', () => {
          el.style.backgroundColor = 'transparent';
        });
      }
    }),

    // User menu
    HStack({ spacing: 12 },
      Text('☰').font(Font.system(14)),
      Circle()
        .fill(Color.hex('#717171'))
        .frame({ width: 30, height: 30 })
        .modifier({
          apply(el) {
            el.innerHTML = '<span style="color: white; font-size: 16px;">👤</span>';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
          }
        })
    )
    .padding({ horizontal: 12, vertical: 6 })
    .modifier({
      apply(el) {
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '22px';
        el.style.cursor = 'pointer';
        el.style.transition = 'box-shadow 0.2s';
        el.addEventListener('mouseenter', () => {
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.boxShadow = 'none';
        });
      }
    })
  );
}

/**
 * Header Component - Adaptive layout using SwiftUI patterns
 *
 * SwiftUI equivalent structure:
 * ```swift
 * struct Header: View {
 *   @Environment(\.horizontalSizeClass) var horizontalSizeClass
 *
 *   var body: some View {
 *     VStack(spacing: 0) {
 *       HStack {
 *         if horizontalSizeClass == .regular {
 *           Logo()
 *         }
 *         Spacer()
 *         if horizontalSizeClass == .regular {
 *           SearchBarDesktop()
 *         }
 *         Spacer()
 *         if horizontalSizeClass == .regular {
 *           HeaderActions()
 *         }
 *       }
 *       if horizontalSizeClass == .compact {
 *         SearchBarMobile()
 *       }
 *       Divider()
 *     }
 *   }
 * }
 * ```
 */
function Header() {
  // Read size class from Environment (like @Environment(\.horizontalSizeClass))
  const isCompact = vm.horizontalSizeClass === UserInterfaceSizeClass.compact;
  const isRegular = vm.horizontalSizeClass === UserInterfaceSizeClass.regular;

  return VStack({ spacing: 0 },
    HStack({ spacing: 16 },
      // Logo - only shown when horizontalSizeClass == .regular
      isRegular ? Logo() : null,

      Spacer(),

      // Search bar - Desktop version only for regular + mac idiom
      (isRegular && vm.deviceIdiom === UserInterfaceIdiom.mac) ? SearchBarDesktop() : null,

      Spacer(),

      // Right side actions - only shown when horizontalSizeClass == .regular
      HeaderActions()
    )
    .padding({
      horizontal: isCompact ? 16 : 24,
      vertical: 16
    }),

    // Mobile/Tablet search bar - shown when compact OR tablet idiom
    (isCompact || vm.deviceIdiom === UserInterfaceIdiom.pad) ?
      VStack({ spacing: 0 },
        SearchBarMobile()
      )
      .padding({ horizontal: 16, bottom: 12 })
      : null,

    Divider()
  )
  .modifier({
    apply(el) {
      el.style.position = 'sticky';
      el.style.top = '0';
      el.style.backgroundColor = 'white';
      el.style.zIndex = '100';
    }
  });
}

// Category Filter Bar
function CategoryBar() {
  return HStack({ spacing: 0 },
    // Categories scroll
    ScrollView({ axis: 'horizontal', showsIndicators: false },
      HStack({ spacing: vm.isMobile ? 24 : 32 },
        ...vm.categories.map(cat =>
          Button(
            VStack({ spacing: 8 },
              Text(cat.icon)
                .font(Font.system(24)),
              Text(cat.name)
                .font(Font.system(12, vm.selectedCategory === cat.id ? Font.Weight.semibold : Font.Weight.regular))
                .foregroundColor(vm.selectedCategory === cat.id ? Color.hex('#222222') : Color.hex('#717171'))
            )
            .padding({ horizontal: 4, vertical: 12 })
            .modifier({
              apply(el) {
                el.style.borderBottom = vm.selectedCategory === cat.id ? '2px solid #222222' : '2px solid transparent';
                el.style.transition = 'border-color 0.2s';
              }
            }),
            () => vm.selectCategory(cat.id)
          )
          .modifier({
            apply(el) {
              el.style.background = 'transparent';
              el.style.border = 'none';
              el.style.cursor = 'pointer';
              el.style.opacity = vm.selectedCategory === cat.id ? '1' : '0.7';
              el.style.transition = 'opacity 0.2s';
              el.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
              el.addEventListener('mouseleave', () => {
                el.style.opacity = vm.selectedCategory === cat.id ? '1' : '0.7';
              });
            }
          })
        )
      )
      .padding({ horizontal: vm.isMobile ? 16 : 24 })
    )
    .modifier({
      apply(el) {
        el.style.flex = '1';
        el.style.overflow = 'hidden';
      }
    }),

    // Filter button (desktop/tablet only)
    !vm.isMobile ?
      Button(
        HStack({ spacing: 8 },
          Text('⚙').font(Font.system(14)),
          Text('Filters')
            .font(Font.system(14, Font.Weight.medium))
        )
        .padding({ horizontal: 16, vertical: 12 }),
        () => { vm.showFilters = true; }
      )
      .modifier({
        apply(el) {
          el.style.background = 'white';
          el.style.border = '1px solid #DDDDDD';
          el.style.borderRadius = '12px';
          el.style.cursor = 'pointer';
          el.style.marginLeft = '16px';
          el.style.marginRight = vm.isMobile ? '16px' : '24px';
          el.style.flexShrink = '0';
        }
      })
    : null
  )
  .padding({ vertical: 12 })
  .modifier({
    apply(el) {
      el.style.borderBottom = '1px solid #EBEBEB';
      el.style.backgroundColor = 'white';
    }
  });
}

// Listing Card Component
function ListingCard(listing) {
  const isFavorite = vm.favorites.has(listing.id);

  return VStack({ alignment: 'leading', spacing: 8 },
    // Image carousel
    ZStack({ alignment: 'topTrailing' },
      // Main image
      Image(listing.images[0])
        .aspectRatio(1)
        .modifier({
          apply(el) {
            el.style.borderRadius = '12px';
            el.style.objectFit = 'cover';
            el.style.width = '100%';
          }
        }),

      // Guest favorite badge
      listing.guestFavorite ?
        HStack({ spacing: 4 },
          Text('Guest favorite')
            .font(Font.system(12, Font.Weight.semibold))
            .foregroundColor(Color.hex('#222222'))
        )
        .padding({ horizontal: 10, vertical: 6 })
        .background(Color.white)
        .cornerRadius(16)
        .modifier({
          apply(el) {
            el.style.position = 'absolute';
            el.style.top = '12px';
            el.style.left = '12px';
          }
        })
      : null,

      // Favorite button
      Button(
        Text(isFavorite ? '❤️' : '🤍')
          .font(Font.system(22)),
        () => vm.toggleFavorite(listing.id)
      )
      .modifier({
        apply(el) {
          el.style.background = 'transparent';
          el.style.border = 'none';
          el.style.cursor = 'pointer';
          el.style.position = 'absolute';
          el.style.top = '12px';
          el.style.right = '12px';
          el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
        }
      })
    )
    .onTapGesture(() => vm.selectListing(listing))
    .modifier({
      apply(el) {
        el.style.cursor = 'pointer';
      }
    }),

    // Info
    VStack({ alignment: 'leading', spacing: 4 },
      // Location and rating
      HStack({ spacing: 4 },
        Text(`${listing.location.city}, ${listing.location.region}`)
          .font(Font.system(15, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Spacer(),
        HStack({ spacing: 4 },
          Text('★').font(Font.system(12)),
          Text(listing.rating.toFixed(2))
            .font(Font.system(14))
            .foregroundColor(Color.hex('#222222'))
        )
      ),

      // Distance
      Text(`${listing.location.distance} kilometers away`)
        .font(Font.system(14))
        .foregroundColor(Color.hex('#717171')),

      // Host info
      listing.superhost ?
        Text(`Hosted by ${listing.host.name} · Superhost`)
          .font(Font.system(14))
          .foregroundColor(Color.hex('#717171'))
        : null,

      // Price
      HStack({ spacing: 4 },
        listing.originalPrice ?
          Text(`$${listing.originalPrice}`)
            .font(Font.system(14))
            .foregroundColor(Color.hex('#717171'))
            .modifier({
              apply(el) {
                el.style.textDecoration = 'line-through';
              }
            })
          : null,
        Text(`$${listing.price}`)
          .font(Font.system(15, Font.Weight.semibold))
          .foregroundColor(Color.hex('#222222')),
        Text('night')
          .font(Font.system(15))
          .foregroundColor(Color.hex('#222222'))
      )
      .padding({ top: 4 })
    )
    .onTapGesture(() => vm.selectListing(listing))
    .modifier({
      apply(el) {
        el.style.cursor = 'pointer';
      }
    })
  )
  .modifier({
    apply(el) {
      el.style.animation = 'fadeIn 0.3s ease';
    }
  });
}

// Listing Grid
function ListingGrid() {
  if (vm.isLoading && vm.listings.length === 0) {
    return LoadingGrid();
  }

  const columnWidth = vm.isMobile ? '100%' :
    vm.isTablet ? 'calc(50% - 12px)' :
    vm.screenWidth < 1440 ? 'calc(33.333% - 16px)' :
    vm.screenWidth < 1920 ? 'calc(25% - 18px)' : 'calc(20% - 19px)';

  return VStack({ spacing: 24 },
    // Grid
    Group(
      ...vm.listings.map(listing => ListingCard(listing))
    )
    .modifier({
      apply(el) {
        el.style.display = 'grid';
        el.style.gridTemplateColumns = `repeat(auto-fill, minmax(${vm.isMobile ? '100%' : '280px'}, 1fr))`;
        el.style.gap = '24px';
        el.style.width = '100%';
      }
    }),

    // Load more button
    vm.hasMore && !vm.isLoading ?
      Button(
        Text('Show more')
          .font(Font.system(16, Font.Weight.semibold))
          .foregroundColor(Color.white),
        () => vm.loadMore()
      )
      .padding({ horizontal: 24, vertical: 14 })
      .background(Color.hex('#222222'))
      .cornerRadius(8)
      : null,

    // Loading indicator
    vm.isLoading && vm.listings.length > 0 ?
      HStack({ spacing: 8 },
        Text('Loading...')
          .font(Font.system(14))
          .foregroundColor(Color.hex('#717171'))
      )
      .padding(16)
      : null
  )
  .padding({ horizontal: vm.isMobile ? 16 : 24, vertical: 24 });
}

// Loading Grid Skeleton
function LoadingGrid() {
  const skeletonCount = vm.isMobile ? 4 : vm.isTablet ? 6 : 12;

  return Group(
    ...Array.from({ length: skeletonCount }, (_, i) =>
      VStack({ alignment: 'leading', spacing: 8 },
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 280 })
          .cornerRadius(12)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          }),
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 20, width: 200 })
          .cornerRadius(4)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          }),
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 16, width: 150 })
          .cornerRadius(4)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          }),
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 16, width: 100 })
          .cornerRadius(4)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          })
      )
    )
  )
  .modifier({
    apply(el) {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(auto-fill, minmax(${vm.isMobile ? '100%' : '280px'}, 1fr))`;
      el.style.gap = '24px';
      el.style.width = '100%';
      el.style.padding = vm.isMobile ? '16px' : '24px';
    }
  });
}

// Filter Modal
function FilterModal() {
  if (!vm.showFilters) return null;

  return ZStack({ alignment: 'center' },
    // Backdrop
    Rectangle()
      .fill(Color.black.opacity(0.5))
      .onTapGesture(() => { vm.showFilters = false; })
      .modifier({
        apply(el) {
          el.style.position = 'fixed';
          el.style.inset = '0';
          el.style.zIndex = '200';
        }
      }),

    // Modal
    VStack({ spacing: 0 },
      // Header
      HStack({ spacing: 16 },
        Button(
          Text('✕').font(Font.system(16)),
          () => { vm.showFilters = false; }
        )
        .modifier({
          apply(el) {
            el.style.background = 'transparent';
            el.style.border = 'none';
            el.style.cursor = 'pointer';
            el.style.padding = '8px';
          }
        }),
        Spacer(),
        Text('Filters')
          .font(Font.system(16, Font.Weight.semibold)),
        Spacer(),
        Rectangle().fill(Color.clear).frame({ width: 32, height: 32 })
      )
      .padding(16)
      .modifier({
        apply(el) {
          el.style.borderBottom = '1px solid #EBEBEB';
        }
      }),

      // Content
      ScrollView({ axis: 'vertical' },
        VStack({ alignment: 'leading', spacing: 32 },
          // Price range
          VStack({ alignment: 'leading', spacing: 16 },
            Text('Price range')
              .font(Font.system(18, Font.Weight.semibold)),
            Text('Nightly prices before fees and taxes')
              .font(Font.system(14))
              .foregroundColor(Color.hex('#717171')),
            HStack({ spacing: 16 },
              VStack({ alignment: 'leading', spacing: 4 },
                Text('Min').font(Font.system(12)).foregroundColor(Color.hex('#717171')),
                TextField('$0', { value: vm.minPrice, onChange: (v) => { vm.minPrice = parseInt(v) || 0; }})
                  .padding(12)
                  .modifier({
                    apply(el) {
                      el.style.border = '1px solid #DDDDDD';
                      el.style.borderRadius = '8px';
                      el.style.width = '100%';
                    }
                  })
              ),
              Text('—').foregroundColor(Color.hex('#717171')),
              VStack({ alignment: 'leading', spacing: 4 },
                Text('Max').font(Font.system(12)).foregroundColor(Color.hex('#717171')),
                TextField('$1000+', { value: vm.maxPrice, onChange: (v) => { vm.maxPrice = parseInt(v) || 1000; }})
                  .padding(12)
                  .modifier({
                    apply(el) {
                      el.style.border = '1px solid #DDDDDD';
                      el.style.borderRadius = '8px';
                      el.style.width = '100%';
                    }
                  })
              )
            )
          ),

          Divider(),

          // Rooms and beds
          VStack({ alignment: 'leading', spacing: 16 },
            Text('Rooms and beds')
              .font(Font.system(18, Font.Weight.semibold)),

            // Bedrooms
            HStack({ spacing: 16 },
              Text('Bedrooms').font(Font.system(16)),
              Spacer(),
              CounterButton('bedroomCount')
            ),

            // Beds
            HStack({ spacing: 16 },
              Text('Beds').font(Font.system(16)),
              Spacer(),
              CounterButton('bedCount')
            ),

            // Bathrooms
            HStack({ spacing: 16 },
              Text('Bathrooms').font(Font.system(16)),
              Spacer(),
              CounterButton('bathroomCount')
            )
          ),

          Divider(),

          // Booking options
          VStack({ alignment: 'leading', spacing: 16 },
            Text('Booking options')
              .font(Font.system(18, Font.Weight.semibold)),

            HStack({ spacing: 16 },
              VStack({ alignment: 'leading', spacing: 4 },
                Text('Instant Book').font(Font.system(16)),
                Text('Listings you can book without waiting for host approval')
                  .font(Font.system(14))
                  .foregroundColor(Color.hex('#717171'))
              ),
              Spacer(),
              Toggle(vm.instantBookOnly, (v) => { vm.instantBookOnly = v; })
            ),

            HStack({ spacing: 16 },
              VStack({ alignment: 'leading', spacing: 4 },
                Text('Superhost').font(Font.system(16)),
                Text('Stay with recognized hosts')
                  .font(Font.system(14))
                  .foregroundColor(Color.hex('#717171'))
              ),
              Spacer(),
              Toggle(vm.superhostOnly, (v) => { vm.superhostOnly = v; })
            )
          ),

          Divider(),

          // Amenities
          VStack({ alignment: 'leading', spacing: 16 },
            Text('Amenities')
              .font(Font.system(18, Font.Weight.semibold)),
            Group(
              ...['Wifi', 'Kitchen', 'Free parking', 'Pool', 'Hot tub', 'Air conditioning',
                  'Washer', 'Dryer', 'Workspace', 'TV', 'BBQ grill', 'Gym'].map(amenity =>
                Button(
                  Text(amenity)
                    .font(Font.system(14))
                    .foregroundColor(vm.selectedAmenities.includes(amenity) ? Color.white : Color.hex('#222222')),
                  () => {
                    if (vm.selectedAmenities.includes(amenity)) {
                      vm.selectedAmenities = vm.selectedAmenities.filter(a => a !== amenity);
                    } else {
                      vm.selectedAmenities = [...vm.selectedAmenities, amenity];
                    }
                  }
                )
                .padding({ horizontal: 16, vertical: 10 })
                .modifier({
                  apply(el) {
                    el.style.background = vm.selectedAmenities.includes(amenity) ? '#222222' : 'white';
                    el.style.border = '1px solid #DDDDDD';
                    el.style.borderRadius = '20px';
                    el.style.cursor = 'pointer';
                  }
                })
              )
            )
            .modifier({
              apply(el) {
                el.style.display = 'flex';
                el.style.flexWrap = 'wrap';
                el.style.gap = '8px';
              }
            })
          )
        )
        .padding(24)
      )
      .modifier({
        apply(el) {
          el.style.flex = '1';
          el.style.overflow = 'auto';
        }
      }),

      // Footer
      HStack({ spacing: 16 },
        Button(
          Text('Clear all')
            .font(Font.system(16, Font.Weight.semibold))
            .foregroundColor(Color.hex('#222222')),
          () => vm.clearFilters()
        )
        .modifier({
          apply(el) {
            el.style.background = 'transparent';
            el.style.border = 'none';
            el.style.cursor = 'pointer';
            el.style.textDecoration = 'underline';
          }
        }),
        Spacer(),
        Button(
          Text(`Show ${vm.listings.length}+ places`)
            .font(Font.system(16, Font.Weight.semibold))
            .foregroundColor(Color.white),
          () => vm.applyFilters()
        )
        .padding({ horizontal: 24, vertical: 14 })
        .background(Color.hex('#222222'))
        .cornerRadius(8)
      )
      .padding(16)
      .modifier({
        apply(el) {
          el.style.borderTop = '1px solid #EBEBEB';
        }
      })
    )
    .background(Color.white)
    .cornerRadius(16)
    .modifier({
      apply(el) {
        el.style.position = 'fixed';
        el.style.zIndex = '201';
        el.style.width = vm.isMobile ? '100%' : '780px';
        el.style.maxWidth = '100%';
        el.style.height = vm.isMobile ? '100%' : '90vh';
        el.style.maxHeight = '100vh';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        if (vm.isMobile) {
          el.style.inset = '0';
          el.style.borderRadius = '0';
        } else {
          el.style.top = '50%';
          el.style.left = '50%';
          el.style.transform = 'translate(-50%, -50%)';
        }
      }
    })
  );
}

// Counter button component
function CounterButton(property) {
  const value = vm[property];

  return HStack({ spacing: 12 },
    Button(
      Text('−')
        .font(Font.system(20))
        .foregroundColor(value > 0 ? Color.hex('#222222') : Color.hex('#DDDDDD')),
      () => {
        if (value > 0) vm[property] = value - 1;
      }
    )
    .frame({ width: 32, height: 32 })
    .modifier({
      apply(el) {
        el.style.background = 'white';
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '50%';
        el.style.cursor = value > 0 ? 'pointer' : 'not-allowed';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
      }
    }),
    Text(value === 0 ? 'Any' : String(value))
      .font(Font.system(16))
      .frame({ width: 32 })
      .modifier({
        apply(el) {
          el.style.textAlign = 'center';
        }
      }),
    Button(
      Text('+')
        .font(Font.system(20))
        .foregroundColor(Color.hex('#222222')),
      () => { vm[property] = value + 1; }
    )
    .frame({ width: 32, height: 32 })
    .modifier({
      apply(el) {
        el.style.background = 'white';
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
      }
    })
  );
}

// Listing Detail Modal
function ListingDetail() {
  const listing = vm.selectedListing;
  if (!listing) return null;

  return ZStack({ alignment: 'center' },
    // Backdrop
    Rectangle()
      .fill(Color.black.opacity(0.5))
      .onTapGesture(() => vm.closeListing())
      .modifier({
        apply(el) {
          el.style.position = 'fixed';
          el.style.inset = '0';
          el.style.zIndex = '200';
        }
      }),

    // Modal content
    VStack({ spacing: 0 },
      // Close button
      HStack({ spacing: 0 },
        Button(
          HStack({ spacing: 8 },
            Text('←').font(Font.system(20)),
            vm.isMobile ? null : Text('Back').font(Font.system(14))
          ),
          () => vm.closeListing()
        )
        .padding(12)
        .modifier({
          apply(el) {
            el.style.background = 'white';
            el.style.border = 'none';
            el.style.borderRadius = '50%';
            el.style.cursor = 'pointer';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          }
        }),
        Spacer()
      )
      .padding(16),

      // Scrollable content
      ScrollView({ axis: 'vertical' },
        VStack({ alignment: 'leading', spacing: 0 },
          // Image gallery
          ScrollView({ axis: 'horizontal', showsIndicators: false },
            HStack({ spacing: 8 },
              ...listing.images.slice(0, 5).map((img, idx) =>
                Image(img)
                  .frame({ width: vm.isMobile ? 300 : 400, height: vm.isMobile ? 200 : 300 })
                  .modifier({
                    apply(el) {
                      el.style.objectFit = 'cover';
                      el.style.borderRadius = idx === 0 ? '12px 0 0 12px' :
                        idx === listing.images.slice(0, 5).length - 1 ? '0 12px 12px 0' : '0';
                    }
                  })
              )
            )
          )
          .padding({ horizontal: vm.isMobile ? 16 : 24, bottom: 24 }),

          // Main content
          HStack({ alignment: 'top', spacing: 48 },
            // Left column - details
            VStack({ alignment: 'leading', spacing: 24 },
              // Title and location
              VStack({ alignment: 'leading', spacing: 8 },
                Text(listing.title)
                  .font(Font.system(vm.isMobile ? 22 : 26, Font.Weight.semibold)),
                HStack({ spacing: 8 },
                  Text(`★ ${listing.rating.toFixed(2)}`)
                    .font(Font.system(14, Font.Weight.semibold)),
                  Text('·').foregroundColor(Color.hex('#717171')),
                  Text(`${listing.reviewCount} reviews`)
                    .font(Font.system(14))
                    .modifier({
                      apply(el) {
                        el.style.textDecoration = 'underline';
                      }
                    }),
                  listing.superhost ? [
                    Text('·').foregroundColor(Color.hex('#717171')),
                    Text('🏅 Superhost').font(Font.system(14))
                  ] : null,
                  Text('·').foregroundColor(Color.hex('#717171')),
                  Text(`${listing.location.city}, ${listing.location.country}`)
                    .font(Font.system(14))
                    .modifier({
                      apply(el) {
                        el.style.textDecoration = 'underline';
                      }
                    })
                )
              ),

              Divider(),

              // Host info
              HStack({ spacing: 16 },
                Image(listing.host.avatar)
                  .frame({ width: 56, height: 56 })
                  .clipShape(Circle())
                  .modifier({
                    apply(el) {
                      el.style.objectFit = 'cover';
                    }
                  }),
                VStack({ alignment: 'leading', spacing: 4 },
                  Text(`Hosted by ${listing.host.name}`)
                    .font(Font.system(16, Font.Weight.semibold)),
                  Text(`${listing.host.yearsHosting} years hosting`)
                    .font(Font.system(14))
                    .foregroundColor(Color.hex('#717171'))
                )
              ),

              Divider(),

              // Property details
              VStack({ alignment: 'leading', spacing: 16 },
                HStack({ spacing: 16 },
                  Text('🏠').font(Font.system(24)),
                  VStack({ alignment: 'leading', spacing: 2 },
                    Text(`${listing.type}`)
                      .font(Font.system(16, Font.Weight.medium)),
                    Text(`${listing.guests} guests · ${listing.bedrooms} bedrooms · ${listing.beds} beds · ${listing.bathrooms} bath`)
                      .font(Font.system(14))
                      .foregroundColor(Color.hex('#717171'))
                  )
                ),
                listing.highlights.map(highlight =>
                  HStack({ spacing: 16 },
                    Text(highlight === 'Superhost' ? '🏅' : highlight === 'Great location' ? '📍' : '✨')
                      .font(Font.system(24)),
                    Text(highlight)
                      .font(Font.system(16, Font.Weight.medium))
                  )
                )
              ),

              Divider(),

              // Description
              VStack({ alignment: 'leading', spacing: 12 },
                Text(listing.description)
                  .font(Font.system(16))
                  .foregroundColor(Color.hex('#222222'))
              ),

              Divider(),

              // Amenities
              VStack({ alignment: 'leading', spacing: 16 },
                Text('What this place offers')
                  .font(Font.system(22, Font.Weight.semibold)),
                Group(
                  ...listing.amenities.slice(0, 10).map(amenity =>
                    HStack({ spacing: 16 },
                      Text(getAmenityIcon(amenity)).font(Font.system(24)),
                      Text(amenity).font(Font.system(16))
                    )
                    .frame({ width: vm.isMobile ? '100%' : '50%' })
                  )
                )
                .modifier({
                  apply(el) {
                    el.style.display = 'flex';
                    el.style.flexWrap = 'wrap';
                    el.style.gap = '16px';
                  }
                }),
                listing.amenities.length > 10 ?
                  Button(
                    Text(`Show all ${listing.amenities.length} amenities`)
                      .font(Font.system(16, Font.Weight.semibold)),
                    () => {}
                  )
                  .padding({ horizontal: 24, vertical: 14 })
                  .modifier({
                    apply(el) {
                      el.style.background = 'white';
                      el.style.border = '1px solid #222222';
                      el.style.borderRadius = '8px';
                      el.style.cursor = 'pointer';
                    }
                  })
                  : null
              )
            )
            .modifier({
              apply(el) {
                el.style.flex = '1';
              }
            }),

            // Right column - booking card (desktop only)
            !vm.isMobile ? BookingCard(listing) : null
          )
          .padding({ horizontal: vm.isMobile ? 16 : 24, bottom: 24 })
          .modifier({
            apply(el) {
              el.style.alignItems = 'flex-start';
            }
          })
        )
      )
      .modifier({
        apply(el) {
          el.style.flex = '1';
          el.style.overflow = 'auto';
        }
      }),

      // Mobile booking bar
      vm.isMobile ? MobileBookingBar(listing) : null
    )
    .background(Color.white)
    .modifier({
      apply(el) {
        el.style.position = 'fixed';
        el.style.inset = '0';
        el.style.zIndex = '201';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
      }
    })
  );
}

// Booking Card (Desktop)
function BookingCard(listing) {
  return VStack({ alignment: 'leading', spacing: 16 },
    // Price
    HStack({ spacing: 4 },
      Text(`$${listing.price}`)
        .font(Font.system(22, Font.Weight.semibold)),
      Text('night')
        .font(Font.system(16))
    ),

    // Date inputs
    VStack({ spacing: 0 },
      HStack({ spacing: 0 },
        VStack({ alignment: 'leading', spacing: 4 },
          Text('CHECK-IN').font(Font.system(10, Font.Weight.semibold)),
          Text('Add date').font(Font.system(14)).foregroundColor(Color.hex('#717171'))
        )
        .padding(12)
        .modifier({
          apply(el) {
            el.style.flex = '1';
            el.style.borderRight = '1px solid #DDDDDD';
          }
        }),
        VStack({ alignment: 'leading', spacing: 4 },
          Text('CHECKOUT').font(Font.system(10, Font.Weight.semibold)),
          Text('Add date').font(Font.system(14)).foregroundColor(Color.hex('#717171'))
        )
        .padding(12)
        .modifier({
          apply(el) {
            el.style.flex = '1';
          }
        })
      ),
      HStack({ spacing: 0 },
        VStack({ alignment: 'leading', spacing: 4 },
          Text('GUESTS').font(Font.system(10, Font.Weight.semibold)),
          Text('1 guest').font(Font.system(14))
        )
        .padding(12)
      )
      .modifier({
        apply(el) {
          el.style.borderTop = '1px solid #DDDDDD';
        }
      })
    )
    .modifier({
      apply(el) {
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '8px';
      }
    }),

    // Reserve button
    Button(
      Text('Reserve')
        .font(Font.system(16, Font.Weight.semibold))
        .foregroundColor(Color.white),
      () => {}
    )
    .frame({ width: '100%' })
    .padding({ vertical: 14 })
    .modifier({
      apply(el) {
        el.style.background = 'linear-gradient(to right, #E61E4D, #E31C5F, #D70466)';
        el.style.border = 'none';
        el.style.borderRadius = '8px';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.justifyContent = 'center';
      }
    }),

    Text("You won't be charged yet")
      .font(Font.system(14))
      .foregroundColor(Color.hex('#717171'))
      .modifier({
        apply(el) {
          el.style.textAlign = 'center';
          el.style.width = '100%';
        }
      }),

    Divider(),

    // Price breakdown
    VStack({ spacing: 12 },
      HStack({ spacing: 0 },
        Text(`$${listing.price} x 5 nights`).font(Font.system(16)),
        Spacer(),
        Text(`$${listing.price * 5}`).font(Font.system(16))
      ),
      HStack({ spacing: 0 },
        Text('Cleaning fee').font(Font.system(16)),
        Spacer(),
        Text(`$${Math.round(listing.price * 0.15)}`).font(Font.system(16))
      ),
      HStack({ spacing: 0 },
        Text('Service fee').font(Font.system(16)),
        Spacer(),
        Text(`$${Math.round(listing.price * 5 * 0.12)}`).font(Font.system(16))
      ),
      Divider(),
      HStack({ spacing: 0 },
        Text('Total before taxes').font(Font.system(16, Font.Weight.semibold)),
        Spacer(),
        Text(`$${listing.price * 5 + Math.round(listing.price * 0.15) + Math.round(listing.price * 5 * 0.12)}`)
          .font(Font.system(16, Font.Weight.semibold))
      )
    )
  )
  .padding(24)
  .modifier({
    apply(el) {
      el.style.width = '372px';
      el.style.border = '1px solid #DDDDDD';
      el.style.borderRadius = '12px';
      el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
      el.style.position = 'sticky';
      el.style.top = '24px';
      el.style.flexShrink = '0';
    }
  });
}

// Mobile Booking Bar
function MobileBookingBar(listing) {
  return HStack({ spacing: 16 },
    VStack({ alignment: 'leading', spacing: 2 },
      HStack({ spacing: 4 },
        Text(`$${listing.price}`)
          .font(Font.system(16, Font.Weight.semibold)),
        Text('night')
          .font(Font.system(14))
      ),
      Text('Add dates for total')
        .font(Font.system(12))
        .foregroundColor(Color.hex('#717171'))
        .modifier({
          apply(el) {
            el.style.textDecoration = 'underline';
          }
        })
    ),
    Spacer(),
    Button(
      Text('Reserve')
        .font(Font.system(16, Font.Weight.semibold))
        .foregroundColor(Color.white),
      () => {}
    )
    .padding({ horizontal: 24, vertical: 14 })
    .modifier({
      apply(el) {
        el.style.background = 'linear-gradient(to right, #E61E4D, #E31C5F, #D70466)';
        el.style.border = 'none';
        el.style.borderRadius = '8px';
        el.style.cursor = 'pointer';
      }
    })
  )
  .padding({ horizontal: 16, vertical: 16 })
  .modifier({
    apply(el) {
      el.style.borderTop = '1px solid #EBEBEB';
      el.style.backgroundColor = 'white';
    }
  });
}

// Helper function to get amenity icon
function getAmenityIcon(amenity) {
  const icons = {
    'Wifi': '📶',
    'Kitchen': '🍳',
    'Free parking': '🅿️',
    'Pool': '🏊',
    'Hot tub': '🛁',
    'Air conditioning': '❄️',
    'Heating': '🔥',
    'Washer': '🧺',
    'Dryer': '👕',
    'TV': '📺',
    'Workspace': '💻',
    'Gym': '🏋️',
    'BBQ grill': '🍖',
    'Fire pit': '🔥',
    'Beach access': '🏖️',
    'Pet friendly': '🐕'
  };
  return icons[amenity] || '✓';
}

// Mobile Bottom Navigation
function MobileNav() {
  if (!vm.isMobile) return null;

  const tabs = [
    { id: 'explore', icon: '🔍', label: 'Explore' },
    { id: 'wishlists', icon: '❤️', label: 'Wishlists' },
    { id: 'trips', icon: '🗺️', label: 'Trips' },
    { id: 'inbox', icon: '💬', label: 'Inbox' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ];

  return HStack({ spacing: 0 },
    ...tabs.map(tab =>
      Button(
        VStack({ spacing: 4 },
          Text(tab.icon).font(Font.system(22)),
          Text(tab.label)
            .font(Font.system(10))
            .foregroundColor(tab.id === 'explore' ? Color.hex('#FF385C') : Color.hex('#717171'))
        ),
        () => {}
      )
      .modifier({
        apply(el) {
          el.style.flex = '1';
          el.style.background = 'transparent';
          el.style.border = 'none';
          el.style.padding = '8px 0';
          el.style.cursor = 'pointer';
        }
      })
    )
  )
  .modifier({
    apply(el) {
      el.style.borderTop = '1px solid #EBEBEB';
      el.style.backgroundColor = 'white';
      el.style.position = 'sticky';
      el.style.bottom = '0';
      el.style.zIndex = '100';
    }
  });
}

// =============================================================================
// Main App
// =============================================================================

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
App(MainApp).mount('#root');

// Set up reactive updates
vm.subscribe(() => {
  App(MainApp).refresh('#root');
});
