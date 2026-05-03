/**
 * ListingGrid Component - Grid display of property listings
 *
 * Reactive on vm.listings, vm.isLoading, vm.hasMore. Mounts once; the
 * embedded Show/For primitives drive the per-section updates.
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack,
  Text, Button, Group,
  Show, For,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';
import { LoadingSkeleton } from '../../Components/index.js';
import { ListingCard } from './ListingCard.js';

/**
 * ListingGrid - Responsive grid of listing cards
 */
export function ListingGrid() {
  return VStack({ spacing: 24 },
    // Initial loading skeleton (only when listings are still empty)
    Show(
      () => vm.isLoading && vm.listings.length === 0,
      LoadingSkeleton(),
    ),

    // Grid of listing cards. Wraps For in a styled Group container so
    // grid-template-columns + gap apply to the cards directly.
    Show(
      () => vm.listings.length > 0,
      Group(
        For(
          () => vm.listings,
          (listing) => ListingCard(listing),
          (l) => l.id,
        )
      )
      .modifier({
        apply(el) {
          el.style.display = 'grid';
          el.style.gridTemplateColumns = `repeat(${vm.gridColumns}, 1fr)`;
          el.style.gap = '24px';
          el.style.width = '100%';
        }
      }),
    ),

    // Load more button — visible when more pages exist and not loading.
    Show(
      () => vm.hasMore && !vm.isLoading,
      Button(
        Text('Show more')
          .font(Font.system(16, Font.Weight.semibold))
          .foregroundColor(Color.white),
        () => vm.loadMore()
      )
      .padding({ horizontal: 24, vertical: 14 })
      .background(Color.hex('#222222'))
      .cornerRadius(8),
    ),

    // Subsequent-page loading indicator.
    Show(
      () => vm.isLoading && vm.listings.length > 0,
      HStack({ spacing: 8 },
        Text('Loading...')
          .font(Font.system(14))
          .foregroundColor(Color.hex('#717171'))
      )
      .padding(16),
    ),
  )
  .padding({ horizontal: vm.isMobile ? 16 : 24, vertical: 24 });
}

export default ListingGrid;
