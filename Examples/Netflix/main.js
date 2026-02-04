/**
 * Netflix Clone - SwiftUI for Web
 *
 * Demonstrates:
 * - Hero banner with gradient overlay (ZStack)
 * - Horizontal scrolling carousels (ScrollView)
 * - Image loading and styling
 * - Navigation with smooth transitions
 * - View Transition API for page changes
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
  // SwiftUI Animation API
  Animation,
  AnyTransition,
  Namespace,
  withAnimation
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
// Components
// =============================================================================

/**
 * Navigation Bar
 */
function NavBar() {
  return HStack({ spacing: 24 },
    // Logo
    Text('SWIFTFLIX')
      .font(Font.system(28, 'bold'))
      .foregroundColor(Color.red),

    // Nav Links
    HStack({ spacing: 16 },
      Text('Home').foregroundColor('white'),
      Text('TV Shows').foregroundColor(Color.gray),
      Text('Movies').foregroundColor(Color.gray),
      Text('New & Popular').foregroundColor(Color.gray)
    ),

    Spacer(),

    // Right side
    HStack({ spacing: 16 },
      Image.systemName('magnifyingglass')
        .foregroundColor('white')
        .font(Font.title2),
      Image.systemName('bell')
        .foregroundColor('white')
        .font(Font.title2),
      Image.systemName('person.fill')
        .foregroundColor('white')
        .font(Font.title2)
    )
  )
  .padding({ horizontal: 48, vertical: 16 })
  .background('rgba(20, 20, 20, 0.9)');
}

/**
 * Hero Banner with featured content
 */
function HeroBanner(movie) {
  return ZStack({ alignment: 'bottomLeading' },
    // Background Image
    Image(movie.backdrop)
      .resizable()
      .aspectRatio('fill')
      .frame({ height: 600 }),

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
    .frame({ height: 600 }),

    // Content
    VStack({ alignment: 'leading', spacing: 16 },
      Text(movie.title)
        .font(Font.system(56, 'bold'))
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

      Text(movie.description)
        .font(Font.body)
        .foregroundColor('white')
        .frame({ maxWidth: 600 })
        .opacity(0.9),

      HStack({ spacing: 12 },
        Button('▶ Play', () => {
          console.log('Play:', movie.title);
        })
        .padding({ horizontal: 32, vertical: 12 })
        .background('white')
        .foregroundColor('black')
        .font(Font.system(18, 'bold'))
        .cornerRadius(4)
        // Implicit animation on hover (using CSS transition)
        .animation(Animation.interactiveSpring, null),

        Button('ℹ More Info', () => {
          // Spring animation for smooth page transition
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
    .padding({ left: 48, bottom: 80 })
  )
  .frame({ height: 600 });
}

/**
 * Movie Card
 * Uses matchedGeometryEffect for hero animation when tapped
 */
function MovieCard(movie) {
  return VStack({ spacing: 8 },
    Image(movie.poster)
      .resizable()
      .aspectRatio('fill')
      .frame({ width: 180, height: 270 })
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
    }
  });
}

/**
 * Movie Row/Carousel
 */
function MovieRow(category) {
  return VStack({ alignment: 'leading', spacing: 8 },
    // Category Title
    Text(category.title)
      .font(Font.system(20, 'bold'))
      .foregroundColor('white')
      .padding({ left: 48 }),

    // Scrolling Carousel
    ScrollView({ axis: 'horizontal', showsIndicators: false },
      HStack({ spacing: 8 },
        // Left padding spacer
        Spacer().frame({ width: 40 }),

        ForEach(category.items, { id: 'id' }, (movie) =>
          MovieCard(movie)
        ),

        // Right padding spacer
        Spacer().frame({ width: 40 })
      )
    )
    .modifier({
      apply(el) {
        el.classList.add('carousel-container');
      }
    })
  )
  .padding({ vertical: 16 });
}

/**
 * Movie Detail View
 * Uses matchedGeometryEffect for hero animation from card
 * Uses .transition() for view appearance
 */
function DetailView(movie) {
  if (!movie) {
    return VStack(
      Text('No movie selected')
        .foregroundColor('white')
    );
  }

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
        // Use easeOut for dismissal (feels more natural)
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
          .frame({ width: 250, height: 375 })
          .cornerRadius(8)
          .shadow({ radius: 20, color: 'rgba(0,0,0,0.5)' })
          // Hero animation: connects to the card poster
          .matchedGeometryEffect(movie.id, heroNamespace),

        // Info with fade + move transition
        VStack({ alignment: 'leading', spacing: 16 },
          Text(movie.title)
            .font(Font.system(42, 'bold'))
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
            .frame({ maxWidth: 500 })
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
      .padding({ horizontal: 48 })
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
    .frame({ height: 'calc(100vh - 60px)' })
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

console.log('Netflix Clone initialized');
