/**
 * Mock API for StayFinder - Vacation Rental Booking App
 * OpenAPI-style data structure with simulated network requests
 */

// =============================================================================
// OpenAPI Schema Definitions
// =============================================================================

/**
 * @typedef {Object} Host
 * @property {string} id - Unique host identifier
 * @property {string} name - Host name
 * @property {string} avatar - Host avatar URL
 * @property {boolean} superhost - Is superhost
 * @property {number} responseRate - Response rate percentage
 * @property {string} responseTime - Typical response time
 * @property {number} yearsHosting - Years as a host
 */

/**
 * @typedef {Object} Location
 * @property {string} city - City name
 * @property {string} region - State/Region
 * @property {string} country - Country
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 */

/**
 * @typedef {Object} Listing
 * @property {string} id - Unique listing identifier
 * @property {string} title - Listing title
 * @property {string} description - Full description
 * @property {string} type - Property type
 * @property {string} category - Category slug
 * @property {string[]} images - Array of image URLs
 * @property {Location} location - Location details
 * @property {Host} host - Host information
 * @property {number} price - Price per night
 * @property {number} originalPrice - Original price (if discounted)
 * @property {string} currency - Currency code
 * @property {number} rating - Average rating
 * @property {number} reviewCount - Number of reviews
 * @property {number} guests - Max guests
 * @property {number} bedrooms - Number of bedrooms
 * @property {number} beds - Number of beds
 * @property {number} bathrooms - Number of bathrooms
 * @property {string[]} amenities - List of amenities
 * @property {boolean} instantBook - Instant book available
 * @property {boolean} superhost - Host is superhost
 * @property {boolean} guestFavorite - Is guest favorite
 * @property {string[]} highlights - Key highlights
 */

// =============================================================================
// Mock Data Generation
// =============================================================================

const categories = [
  { id: 'amazing-views', name: 'Amazing views', icon: '🏔️' },
  { id: 'beach', name: 'Beach', icon: '🏖️' },
  { id: 'cabins', name: 'Cabins', icon: '🏡' },
  { id: 'countryside', name: 'Countryside', icon: '🌾' },
  { id: 'design', name: 'Design', icon: '🎨' },
  { id: 'islands', name: 'Islands', icon: '🏝️' },
  { id: 'lakefront', name: 'Lakefront', icon: '🌊' },
  { id: 'luxe', name: 'Luxe', icon: '💎' },
  { id: 'mansions', name: 'Mansions', icon: '🏰' },
  { id: 'national-parks', name: 'National parks', icon: '🌲' },
  { id: 'omg', name: 'OMG!', icon: '😱' },
  { id: 'pools', name: 'Amazing pools', icon: '🏊' },
  { id: 'skiing', name: 'Skiing', icon: '⛷️' },
  { id: 'tiny-homes', name: 'Tiny homes', icon: '🏠' },
  { id: 'treehouses', name: 'Treehouses', icon: '🌳' },
  { id: 'trending', name: 'Trending', icon: '🔥' },
  { id: 'tropical', name: 'Tropical', icon: '🌴' },
  { id: 'vineyards', name: 'Vineyards', icon: '🍷' },
];

const amenitiesList = [
  'Wifi', 'Kitchen', 'Free parking', 'Pool', 'Hot tub', 'Air conditioning',
  'Heating', 'Washer', 'Dryer', 'TV', 'Workspace', 'Gym', 'EV charger',
  'BBQ grill', 'Fire pit', 'Indoor fireplace', 'Piano', 'Game room',
  'Beach access', 'Ski-in/Ski-out', 'Waterfront', 'Lake access', 'Balcony',
  'Patio', 'Garden', 'Pet friendly', 'Smoke alarm', 'Carbon monoxide alarm',
  'First aid kit', 'Fire extinguisher', 'Self check-in', 'Lockbox'
];

const propertyTypes = [
  'Entire home', 'Entire villa', 'Entire cabin', 'Entire condo',
  'Entire cottage', 'Entire bungalow', 'Entire loft', 'Entire apartment',
  'Private room', 'Treehouse', 'Tiny home', 'Houseboat', 'Yurt', 'Dome'
];

const cities = [
  { city: 'Malibu', region: 'California', country: 'United States', lat: 34.0259, lng: -118.7798 },
  { city: 'Aspen', region: 'Colorado', country: 'United States', lat: 39.1911, lng: -106.8175 },
  { city: 'Lake Tahoe', region: 'California', country: 'United States', lat: 39.0968, lng: -120.0324 },
  { city: 'Miami Beach', region: 'Florida', country: 'United States', lat: 25.7907, lng: -80.1300 },
  { city: 'Joshua Tree', region: 'California', country: 'United States', lat: 34.1347, lng: -116.3131 },
  { city: 'Sedona', region: 'Arizona', country: 'United States', lat: 34.8697, lng: -111.7610 },
  { city: 'Big Sur', region: 'California', country: 'United States', lat: 36.2704, lng: -121.8081 },
  { city: 'Nashville', region: 'Tennessee', country: 'United States', lat: 36.1627, lng: -86.7816 },
  { city: 'Austin', region: 'Texas', country: 'United States', lat: 30.2672, lng: -97.7431 },
  { city: 'Portland', region: 'Oregon', country: 'United States', lat: 45.5152, lng: -122.6784 },
  { city: 'Santorini', region: 'Cyclades', country: 'Greece', lat: 36.3932, lng: 25.4615 },
  { city: 'Bali', region: 'Ubud', country: 'Indonesia', lat: -8.5069, lng: 115.2625 },
  { city: 'Tulum', region: 'Quintana Roo', country: 'Mexico', lat: 20.2114, lng: -87.4654 },
  { city: 'Cape Town', region: 'Western Cape', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { city: 'Queenstown', region: 'Otago', country: 'New Zealand', lat: -45.0312, lng: 168.6626 },
];

const hostNames = [
  'Sarah', 'Michael', 'Emma', 'James', 'Olivia', 'William', 'Sophia', 'Benjamin',
  'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Daniel'
];

const titlePrefixes = [
  'Stunning', 'Luxurious', 'Charming', 'Modern', 'Cozy', 'Spectacular',
  'Elegant', 'Beautiful', 'Spacious', 'Unique', 'Peaceful', 'Private'
];

const titleSuffixes = [
  'with Mountain Views', 'with Ocean Views', 'with Pool', 'Retreat',
  'Near Downtown', 'in the Heart of', 'with Hot Tub', 'Getaway',
  'with Panoramic Views', 'Paradise', 'Oasis', 'Hideaway', 'Sanctuary'
];

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Random selection helper
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

// Generate placeholder images (using picsum for demo)
const generateImages = (count = 5, seed) => {
  return Array.from({ length: count }, (_, i) =>
    `https://picsum.photos/seed/${seed}-${i}/800/600`
  );
};

// Generate a single listing
const generateListing = (index) => {
  const id = generateId();
  const location = randomFrom(cities);
  const category = randomFrom(categories);
  const propertyType = randomFrom(propertyTypes);
  const hostName = randomFrom(hostNames);
  const isSuperhost = Math.random() > 0.7;
  const isGuestFavorite = Math.random() > 0.8;

  const bedrooms = randomRange(1, 6);
  const beds = randomRange(bedrooms, bedrooms + 3);
  const bathrooms = randomRange(1, bedrooms + 1);
  const guests = randomRange(beds, beds + 4);

  const basePrice = randomRange(80, 800);
  const hasDiscount = Math.random() > 0.7;

  const amenityCount = randomRange(8, 20);
  const selectedAmenities = [...amenitiesList]
    .sort(() => Math.random() - 0.5)
    .slice(0, amenityCount);

  return {
    id,
    title: `${randomFrom(titlePrefixes)} ${propertyType} ${randomFrom(titleSuffixes)}`,
    description: `Experience the perfect getaway at this ${propertyType.toLowerCase()} in ${location.city}. ` +
      `Featuring ${bedrooms} bedroom${bedrooms > 1 ? 's' : ''}, ${bathrooms} bathroom${bathrooms > 1 ? 's' : ''}, ` +
      `and space for ${guests} guests. Enjoy modern amenities and stunning surroundings.`,
    type: propertyType,
    category: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    images: generateImages(randomRange(5, 8), id),
    location: {
      city: location.city,
      region: location.region,
      country: location.country,
      lat: location.lat + randomFloat(-0.1, 0.1),
      lng: location.lng + randomFloat(-0.1, 0.1),
      distance: randomRange(5, 500)
    },
    host: {
      id: generateId(),
      name: hostName,
      avatar: `https://i.pravatar.cc/150?u=${hostName.toLowerCase()}${index}`,
      superhost: isSuperhost,
      responseRate: randomRange(90, 100),
      responseTime: randomFrom(['within an hour', 'within a few hours', 'within a day']),
      yearsHosting: randomRange(1, 10)
    },
    price: basePrice,
    originalPrice: hasDiscount ? Math.round(basePrice * randomFloat(1.1, 1.3)) : null,
    currency: 'USD',
    rating: randomFloat(4.5, 5.0),
    reviewCount: randomRange(10, 500),
    guests,
    bedrooms,
    beds,
    bathrooms,
    amenities: selectedAmenities,
    instantBook: Math.random() > 0.3,
    superhost: isSuperhost,
    guestFavorite: isGuestFavorite,
    highlights: [
      isSuperhost ? 'Superhost' : null,
      isGuestFavorite ? 'Guest favorite' : null,
      Math.random() > 0.5 ? 'Great location' : null,
      Math.random() > 0.5 ? 'Sparkling clean' : null,
      Math.random() > 0.6 ? 'Great check-in' : null,
    ].filter(Boolean).slice(0, 3),
    dates: {
      available: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + randomRange(1, 5));
        return date.toISOString().split('T')[0];
      })
    }
  };
};

// Generate all listings
const generateListings = (count = 50) => {
  return Array.from({ length: count }, (_, i) => generateListing(i));
};

// =============================================================================
// Mock API Service
// =============================================================================

class MockApiService {
  constructor() {
    this.listings = generateListings(60);
    this.categories = categories;
    this.delay = 300; // Simulated network delay
  }

  /**
   * Simulate network delay
   */
  async _delay(ms = this.delay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET /api/categories
   * Returns all available categories
   */
  async getCategories() {
    await this._delay(100);
    return {
      success: true,
      data: this.categories,
      meta: {
        total: this.categories.length
      }
    };
  }

  /**
   * GET /api/listings
   * Returns listings with optional filters
   * @param {Object} params - Query parameters
   */
  async getListings(params = {}) {
    await this._delay();

    let filtered = [...this.listings];

    // Filter by category
    if (params.category && params.category !== 'all') {
      filtered = filtered.filter(l => l.category === params.category);
    }

    // Filter by location search
    if (params.location) {
      const searchTerm = params.location.toLowerCase();
      filtered = filtered.filter(l =>
        l.location.city.toLowerCase().includes(searchTerm) ||
        l.location.region.toLowerCase().includes(searchTerm) ||
        l.location.country.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by guests
    if (params.guests) {
      filtered = filtered.filter(l => l.guests >= params.guests);
    }

    // Filter by bedrooms
    if (params.bedrooms) {
      filtered = filtered.filter(l => l.bedrooms >= params.bedrooms);
    }

    // Filter by beds
    if (params.beds) {
      filtered = filtered.filter(l => l.beds >= params.beds);
    }

    // Filter by bathrooms
    if (params.bathrooms) {
      filtered = filtered.filter(l => l.bathrooms >= params.bathrooms);
    }

    // Filter by price range
    if (params.minPrice) {
      filtered = filtered.filter(l => l.price >= params.minPrice);
    }
    if (params.maxPrice) {
      filtered = filtered.filter(l => l.price <= params.maxPrice);
    }

    // Filter by amenities
    if (params.amenities && params.amenities.length > 0) {
      filtered = filtered.filter(l =>
        params.amenities.every(a => l.amenities.includes(a))
      );
    }

    // Filter by property type
    if (params.propertyType) {
      filtered = filtered.filter(l => l.type === params.propertyType);
    }

    // Filter by instant book
    if (params.instantBook) {
      filtered = filtered.filter(l => l.instantBook);
    }

    // Filter by superhost
    if (params.superhost) {
      filtered = filtered.filter(l => l.superhost);
    }

    // Filter by guest favorite
    if (params.guestFavorite) {
      filtered = filtered.filter(l => l.guestFavorite);
    }

    // Sort
    if (params.sort) {
      switch (params.sort) {
        case 'price_asc':
          filtered.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filtered.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case 'reviews':
          filtered.sort((a, b) => b.reviewCount - a.reviewCount);
          break;
        default:
          // Default: featured/random
          break;
      }
    }

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      success: true,
      data: paginated,
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
        hasMore: end < filtered.length
      }
    };
  }

  /**
   * GET /api/listings/:id
   * Returns a single listing by ID
   */
  async getListing(id) {
    await this._delay();

    const listing = this.listings.find(l => l.id === id);

    if (!listing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Listing not found'
        }
      };
    }

    // Add extra details for single listing view
    const detailed = {
      ...listing,
      reviews: this._generateReviews(listing.reviewCount),
      similarListings: this.listings
        .filter(l => l.id !== id && l.category === listing.category)
        .slice(0, 6),
      cancellationPolicy: randomFrom(['Flexible', 'Moderate', 'Strict']),
      houseRules: [
        'Check-in: 3:00 PM - 10:00 PM',
        'Checkout: 11:00 AM',
        'No smoking',
        'No parties or events',
        listing.amenities.includes('Pet friendly') ? 'Pets allowed' : 'No pets'
      ],
      safetyInfo: [
        'Carbon monoxide alarm',
        'Smoke alarm',
        'Security camera on property'
      ]
    };

    return {
      success: true,
      data: detailed
    };
  }

  /**
   * POST /api/bookings
   * Create a new booking
   */
  async createBooking(data) {
    await this._delay(500);

    // Validate required fields
    if (!data.listingId || !data.checkIn || !data.checkOut || !data.guests) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields'
        }
      };
    }

    const listing = this.listings.find(l => l.id === data.listingId);
    if (!listing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Listing not found'
        }
      };
    }

    const nights = Math.ceil(
      (new Date(data.checkOut) - new Date(data.checkIn)) / (1000 * 60 * 60 * 24)
    );

    const subtotal = listing.price * nights;
    const cleaningFee = Math.round(listing.price * 0.15);
    const serviceFee = Math.round(subtotal * 0.12);
    const taxes = Math.round((subtotal + cleaningFee + serviceFee) * 0.08);
    const total = subtotal + cleaningFee + serviceFee + taxes;

    return {
      success: true,
      data: {
        id: generateId(),
        listingId: data.listingId,
        listing: {
          title: listing.title,
          image: listing.images[0],
          host: listing.host.name
        },
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        nights,
        pricing: {
          pricePerNight: listing.price,
          subtotal,
          cleaningFee,
          serviceFee,
          taxes,
          total,
          currency: listing.currency
        },
        status: 'confirmed',
        confirmationCode: `SF${generateId().toUpperCase()}`
      }
    };
  }

  /**
   * GET /api/search/suggestions
   * Get location search suggestions
   */
  async getSearchSuggestions(query) {
    await this._delay(100);

    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    const searchTerm = query.toLowerCase();
    const suggestions = [];
    const seen = new Set();

    for (const listing of this.listings) {
      const cityKey = `${listing.location.city}-${listing.location.region}`;
      if (!seen.has(cityKey)) {
        if (
          listing.location.city.toLowerCase().includes(searchTerm) ||
          listing.location.region.toLowerCase().includes(searchTerm) ||
          listing.location.country.toLowerCase().includes(searchTerm)
        ) {
          seen.add(cityKey);
          suggestions.push({
            type: 'location',
            city: listing.location.city,
            region: listing.location.region,
            country: listing.location.country
          });
        }
      }
      if (suggestions.length >= 5) break;
    }

    return {
      success: true,
      data: suggestions
    };
  }

  /**
   * Generate mock reviews
   */
  _generateReviews(count) {
    const reviewTexts = [
      'Amazing place! The views were incredible and the host was very responsive.',
      'Perfect getaway. Clean, comfortable, and exactly as described.',
      'We had a wonderful stay. Would definitely recommend!',
      'Great location, beautiful property. Will be back!',
      'Exceeded our expectations. The amenities were top-notch.',
      'Such a peaceful retreat. Perfect for a relaxing vacation.',
      'Loved everything about this place. The photos don\'t do it justice!',
      'Fantastic experience from start to finish. Highly recommend.',
      'The host thought of everything. We felt right at home.',
      'Stunning property with all the comforts. Worth every penny.'
    ];

    const displayCount = Math.min(count, 10);
    return Array.from({ length: displayCount }, (_, i) => ({
      id: generateId(),
      user: {
        name: randomFrom(hostNames),
        avatar: `https://i.pravatar.cc/150?u=reviewer${i}`,
        location: `${randomFrom(cities).city}`
      },
      rating: randomFloat(4, 5, 1),
      date: new Date(Date.now() - randomRange(1, 365) * 24 * 60 * 60 * 1000).toISOString(),
      text: randomFrom(reviewTexts)
    }));
  }
}

// Export singleton instance
export const api = new MockApiService();
export { categories, amenitiesList, propertyTypes };
export default api;
