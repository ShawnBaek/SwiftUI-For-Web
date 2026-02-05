/**
 * Netflix Clone - SwiftUI for Web
 *
 * Demonstrates:
 * - Hero banner with gradient overlay (ZStack)
 * - Horizontal scrolling carousels (ScrollView)
 * - Image loading and styling
 * - Navigation with smooth transitions
 * - View Transition API for page changes
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
  NavigationStack,
  NavigationLink,
  BackButton,
  State,
  View,
  ViewThatFits,
  // SwiftUI Animation API
  Animation,
  AnyTransition,
  Namespace,
  withAnimation,
  // Environment for adaptive layout
  Environment,
  EnvironmentValues,
  UserInterfaceSizeClass,
  currentDeviceIdiom
} from '../../src/index.js';

// =============================================================================
// Namespace for matchedGeometryEffect (hero animations)
// =============================================================================

const heroNamespace = Namespace();

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
      poster: `${PLACEHOLDER_BASE}/doc${i}/300/450`,
      year: 2024 - Math.floor(Math.random() * 5),
      rating: ['TV-G', 'TV-PG', 'TV-14'][Math.floor(Math.random() * 3)]
    }))
  }
];

// =============================================================================
// State
// =============================================================================

const selectedMovie = new State(null);
const showDetail = new State(false);

// =============================================================================
// Responsive Helpers
// =============================================================================

/**
 * Get current size class and layout info
 */
function getLayoutInfo() {
  const horizontalSizeClass = Environment.get(EnvironmentValues.horizontalSizeClass);
  const isMobile = horizontalSizeClass === UserInterfaceSizeClass.compact;
  const width = window.innerWidth;

  return {
    isMobile,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    horizontalSizeClass,
    // Card sizes based on screen size
    cardWidth: isMobile ? 120 : (width < 1024 ? 150 : 180),
    cardHeight: isMobile ? 180 : (width < 1024 ? 225 : 270),
    // Hero height
    heroHeight: isMobile ? 400 : (width < 1024 ? 500 : 600),
    // Padding
    horizontalPadding: isMobile ? 16 : (width < 1024 ? 32 : 48)
  };
}

// =============================================================================
// Components
// =============================================================================

/**
 * Navigation Bar - Responsive
 */
function NavBar() {
  const layout = getLayoutInfo();

  // Mobile nav bar
  if (layout.isMobile) {
    return HStack({ spacing: 16 },
      // Logo
      Text('SWIFTFLIX')
        .font(Font.system(22, 'bold'))
        .foregroundColor(Color.red),

      Spacer(),

      // Menu icon (SVG)
      new View().modifier({
        apply(el) {
          el.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          `;
          el.style.display = 'flex';
          el.style.cursor = 'pointer';
        }
      })
    )
    .padding({ horizontal: 16, vertical: 12 })
    .background('rgba(20, 20, 20, 0.95)');
  }

  // Desktop/Tablet nav bar
  return HStack({ spacing: 24 },
    // Logo
    Text('SWIFTFLIX')
      .font(Font.system(28, 'bold'))
      .foregroundColor(Color.red),

    // Nav Links (hidden on tablet)
    layout.isDesktop ? HStack({ spacing: 16 },
      Text('Home').foregroundColor('white'),
      Text('TV Shows').foregroundColor(Color.gray),
      Text('Movies').foregroundColor(Color.gray),
      Text('New & Popular').foregroundColor(Color.gray)
    ) : null,

    Spacer(),

    // Right side - SVG icons
    HStack({ spacing: 16 },
      // Search icon
      new View().modifier({
        apply(el) {
          el.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          `;
          el.style.display = 'flex';
          el.style.cursor = 'pointer';
        }
      }),
      // Bell icon
      new View().modifier({
        apply(el) {
          el.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          `;
          el.style.display = 'flex';
          el.style.cursor = 'pointer';
        }
      }),
      // Profile icon
      new View().modifier({
        apply(el) {
          el.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            </svg>
          `;
          el.style.display = 'flex';
          el.style.cursor = 'pointer';
        }
      })
    )
  )
  .padding({ horizontal: layout.horizontalPadding, vertical: 16 })
  .background('rgba(20, 20, 20, 0.9)');
}

/**
 * Hero Banner with featured content - Responsive
 */
function HeroBanner(movie) {
  const layout = getLayoutInfo();

  return ZStack({ alignment: 'bottomLeading' },
    // Background Image
    Image(movie.backdrop)
      .resizable()
      .aspectRatio('fill')
      .frame({ height: layout.heroHeight }),

    // Gradient Overlay
    LinearGradient(
      [
        'transparent',
        'rgba(20, 20, 20, 0.4)',
        'rgba(20, 20, 20, 0.9)',
        '#141414'
      ],
      { direction: 'to bottom' }
    )
    .frame({ height: layout.heroHeight }),

    // Content - Responsive
    VStack({ alignment: 'leading', spacing: layout.isMobile ? 12 : 16 },
      Text(movie.title)
        .font(Font.system(layout.isMobile ? 32 : (layout.isTablet ? 44 : 56), 'bold'))
        .foregroundColor('white'),

      HStack({ spacing: 12 },
        Text(movie.rating)
          .font(Font.caption)
          .foregroundColor('white')
          .padding({ horizontal: 8, vertical: 4 })
          .border('white', 1)
          .cornerRadius(4),
        Text(movie.year)
          .font(Font.body)
          .foregroundColor(Color.gray),
        Text(movie.duration)
          .font(Font.body)
          .foregroundColor(Color.gray)
      ),

      // Description - hidden on mobile
      !layout.isMobile ? Text(movie.description)
        .font(Font.body)
        .foregroundColor('white')
        .frame({ maxWidth: layout.isTablet ? 400 : 600 })
        .opacity(0.9) : null,

      // Buttons
      layout.isMobile ?
        // Mobile: Stacked buttons
        VStack({ spacing: 8 },
          Button('▶ Play', () => console.log('Play:', movie.title))
            .modifier({
              apply(el) {
                el.style.width = '100%';
                el.style.padding = '12px';
                el.style.background = 'white';
                el.style.color = 'black';
                el.style.fontWeight = 'bold';
                el.style.border = 'none';
                el.style.borderRadius = '4px';
                el.style.cursor = 'pointer';
              }
            }),
          Button('ℹ More Info', () => {
            withAnimation(Animation.spring({ response: 0.5, dampingFraction: 0.85 }), () => {
              selectedMovie.value = movie;
              showDetail.value = true;
            });
          })
          .modifier({
            apply(el) {
              el.style.width = '100%';
              el.style.padding = '12px';
              el.style.background = 'rgba(109, 109, 110, 0.7)';
              el.style.color = 'white';
              el.style.fontWeight = 'bold';
              el.style.border = 'none';
              el.style.borderRadius = '4px';
              el.style.cursor = 'pointer';
            }
          })
        )
        .frame({ width: '100%' })
        :
        // Desktop/Tablet: Side by side buttons
        HStack({ spacing: 12 },
          Button('▶ Play', () => console.log('Play:', movie.title))
            .padding({ horizontal: 32, vertical: 12 })
            .background('white')
            .foregroundColor('black')
            .font(Font.system(18, 'bold'))
            .cornerRadius(4)
            .animation(Animation.interactiveSpring, null),

          Button('ℹ More Info', () => {
            withAnimation(Animation.spring({ response: 0.5, dampingFraction: 0.85 }), () => {
              selectedMovie.value = movie;
              showDetail.value = true;
            });
          })
          .padding({ horizontal: 32, vertical: 12 })
          .background('rgba(109, 109, 110, 0.7)')
          .foregroundColor('white')
          .font(Font.system(18, 'bold'))
          .cornerRadius(4)
          .animation(Animation.interactiveSpring, null)
        )
        .padding({ top: 16 })
    )
    .padding({
      left: layout.horizontalPadding,
      right: layout.horizontalPadding,
      bottom: layout.isMobile ? 40 : 80
    })
  )
  .frame({ height: layout.heroHeight });
}

/**
 * Movie Card - Responsive
 * Uses matchedGeometryEffect for hero animation when tapped
 */
function MovieCard(movie) {
  const layout = getLayoutInfo();

  return VStack({ spacing: 8 },
    Image(movie.poster)
      .resizable()
      .aspectRatio('fill')
      .frame({ width: layout.cardWidth, height: layout.cardHeight })
      .cornerRadius(4)
      // Hero animation: this image will animate to the detail view
      .matchedGeometryEffect(movie.id, heroNamespace)
  )
  .onTapGesture(() => {
    // Use SwiftUI-style spring animation
    withAnimation(Animation.spring({ response: 0.4, dampingFraction: 0.8 }), () => {
      selectedMovie.value = movie;
      showDetail.value = true;
    });
  })
  .modifier({
    apply(el) {
      el.classList.add('movie-card');
      el.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.08)';
        el.style.boxShadow = '0 8px 25px rgba(0,0,0,0.5)';
        el.style.zIndex = '10';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = 'none';
        el.style.zIndex = '1';
      });
    }
  });
}

/**
 * Movie Row/Carousel - Responsive
 */
function MovieRow(category) {
  const layout = getLayoutInfo();

  return VStack({ alignment: 'leading', spacing: 8 },
    // Category Title
    Text(category.title)
      .font(Font.system(layout.isMobile ? 16 : 20, 'bold'))
      .foregroundColor('white')
      .padding({ left: layout.horizontalPadding }),

    // Scrolling Carousel
    ScrollView({ axis: 'horizontal', showsIndicators: false },
      HStack({ spacing: layout.isMobile ? 8 : 12 },
        // Left padding spacer
        Spacer().frame({ width: layout.horizontalPadding - 8 }),

        ForEach(category.items, { id: 'id' }, (movie) =>
          MovieCard(movie)
        ),

        // Right padding spacer
        Spacer().frame({ width: layout.horizontalPadding - 8 })
      )
    )
    .modifier({
      apply(el) {
        el.classList.add('carousel-container');
      }
    })
  )
  .padding({ vertical: layout.isMobile ? 12 : 16 });
}

/**
 * Movie Detail View - Responsive
 * Uses matchedGeometryEffect for hero animation from card
 * Uses .transition() for view appearance
 */
function DetailView(movie) {
  const layout = getLayoutInfo();

  if (!movie) {
    return VStack(
      Text('No movie selected')
        .foregroundColor('white')
    );
  }

  // Mobile layout
  if (layout.isMobile) {
    return ZStack({ alignment: 'top' },
      // Background
      VStack(
        Image(movie.poster || movie.backdrop)
          .resizable()
          .aspectRatio('fill')
          .frame({ height: 300 })
          .opacity(0.3),
        Spacer()
      ),

      // Gradient
      LinearGradient(
        ['transparent', '#141414'],
        { direction: 'to bottom' }
      ),

      // Content - Mobile
      VStack({ alignment: 'leading', spacing: 16 },
        // Back button
        Button('← Back', () => {
          withAnimation(Animation.easeOut(0.3), () => {
            showDetail.value = false;
            selectedMovie.value = null;
          });
        })
        .foregroundColor('white')
        .padding(12)
        .background('rgba(0,0,0,0.5)')
        .cornerRadius(8),

        // Poster centered
        Image(movie.poster)
          .resizable()
          .frame({ width: 150, height: 225 })
          .cornerRadius(8)
          .shadow({ radius: 20, color: 'rgba(0,0,0,0.5)' })
          .matchedGeometryEffect(movie.id, heroNamespace)
          .modifier({
            apply(el) {
              el.style.alignSelf = 'center';
            }
          }),

        // Info
        VStack({ alignment: 'leading', spacing: 12 },
          Text(movie.title)
            .font(Font.system(28, 'bold'))
            .foregroundColor('white'),

          HStack({ spacing: 12 },
            Text(movie.year)
              .font(Font.body)
              .foregroundColor(Color.green),
            Text(movie.rating)
              .font(Font.caption)
              .foregroundColor('white')
              .padding({ horizontal: 6, vertical: 2 })
              .border('white', 1)
              .cornerRadius(4)
          ),

          Text(movie.description || 'An exciting movie that will keep you on the edge of your seat.')
            .font(Font.body)
            .foregroundColor('white')
            .opacity(0.9),

          // Full width buttons
          VStack({ spacing: 8 },
            Button('▶ Play', () => console.log('Play'))
              .modifier({
                apply(el) {
                  el.style.width = '100%';
                  el.style.padding = '14px';
                  el.style.background = 'white';
                  el.style.color = 'black';
                  el.style.fontWeight = 'bold';
                  el.style.border = 'none';
                  el.style.borderRadius = '4px';
                  el.style.cursor = 'pointer';
                }
              }),
            Button('+ My List', () => console.log('Add to list'))
              .modifier({
                apply(el) {
                  el.style.width = '100%';
                  el.style.padding = '14px';
                  el.style.background = 'rgba(109, 109, 110, 0.7)';
                  el.style.color = 'white';
                  el.style.border = 'none';
                  el.style.borderRadius = '4px';
                  el.style.cursor = 'pointer';
                }
              })
          )
          .padding({ top: 8 })
        )
        .padding({ horizontal: 16 })
      )
      .padding({ top: 16, bottom: 32 })
    )
    .transition(AnyTransition.scale(0.95).combined(AnyTransition.opacity));
  }

  // Desktop/Tablet layout
  return ZStack({ alignment: 'top' },
    // Background
    VStack(
      Image(movie.poster || movie.backdrop)
        .resizable()
        .aspectRatio('fill')
        .frame({ height: 500 })
        .opacity(0.3),
      Spacer()
    ),

    // Gradient
    LinearGradient(
      ['transparent', '#141414'],
      { direction: 'to bottom' }
    ),

    // Content
    VStack({ alignment: 'leading', spacing: 24 },
      // Back button with slide transition
      Button('← Back', () => {
        withAnimation(Animation.easeOut(0.3), () => {
          showDetail.value = false;
          selectedMovie.value = null;
        });
      })
      .foregroundColor('white')
      .padding(16)
      .background('rgba(0,0,0,0.5)')
      .cornerRadius(8)
      .transition(AnyTransition.move('leading').combined(AnyTransition.opacity)),

      Spacer().frame({ height: 200 }),

      HStack({ spacing: 32 },
        // Poster with hero animation (matches the card)
        Image(movie.poster)
          .resizable()
          .frame({ width: layout.isTablet ? 200 : 250, height: layout.isTablet ? 300 : 375 })
          .cornerRadius(8)
          .shadow({ radius: 20, color: 'rgba(0,0,0,0.5)' })
          // Hero animation: connects to the card poster
          .matchedGeometryEffect(movie.id, heroNamespace),

        // Info with fade + move transition
        VStack({ alignment: 'leading', spacing: 16 },
          Text(movie.title)
            .font(Font.system(layout.isTablet ? 32 : 42, 'bold'))
            .foregroundColor('white'),

          HStack({ spacing: 16 },
            Text(movie.year)
              .font(Font.title2)
              .foregroundColor(Color.green),
            Text(movie.rating)
              .font(Font.body)
              .foregroundColor('white')
              .padding({ horizontal: 8, vertical: 4 })
              .border('white', 1)
              .cornerRadius(4),
            movie.duration ? Text(movie.duration)
              .font(Font.body)
              .foregroundColor(Color.gray) : null
          ),

          Text(movie.description || 'An exciting movie that will keep you on the edge of your seat.')
            .font(Font.body)
            .foregroundColor('white')
            .frame({ maxWidth: layout.isTablet ? 350 : 500 })
            .opacity(0.9),

          HStack({ spacing: 16 },
            Button('▶ Play', () => console.log('Play'))
              .padding({ horizontal: 40, vertical: 14 })
              .background('white')
              .foregroundColor('black')
              .font(Font.system(18, 'bold'))
              .cornerRadius(4)
              .animation(Animation.spring(), null),

            Button('+ My List', () => console.log('Add to list'))
              .padding({ horizontal: 24, vertical: 14 })
              .background('rgba(109, 109, 110, 0.7)')
              .foregroundColor('white')
              .font(Font.body)
              .cornerRadius(4)
          )
          .padding({ top: 16 })
        )
        .transition(AnyTransition.opacity.combined(AnyTransition.move('trailing')))
      )
      .padding({ horizontal: layout.horizontalPadding })
    )
    .padding({ top: 24 })
  )
  // Entire detail view uses scale + fade transition
  .transition(AnyTransition.scale(0.95).combined(AnyTransition.opacity));
}

/**
 * Home View
 */
function HomeView() {
  return VStack({ spacing: 0 },
    // Hero
    HeroBanner(featuredMovie),

    // Movie Rows
    VStack({ spacing: 0 },
      ForEach(categories, { id: 'title' }, (category) =>
        MovieRow(category)
      )
    )
    .padding({ top: 20 })
  );
}

/**
 * Main App View
 */
function NetflixApp() {
  const layout = getLayoutInfo();

  // Conditional rendering based on state
  const currentView = showDetail.value
    ? DetailView(selectedMovie.value)
    : HomeView();

  return VStack({ spacing: 0 },
    // Fixed Nav Bar
    NavBar(),

    // Main Content (scrollable)
    ScrollView({ showsIndicators: false },
      currentView
    )
    .modifier({
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

// Re-render on state changes
showDetail.subscribe(() => {
  app.refresh();
});

selectedMovie.subscribe(() => {
  app.refresh();
});

// Re-render on window resize for adaptive layout
Environment.subscribe(EnvironmentValues.horizontalSizeClass, () => {
  app.refresh();
});

console.log('Netflix Clone initialized with adaptive layout');
