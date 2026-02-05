/**
 * ListingGrid Component - Grid display of property listings
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack,
  Text, Button, Group,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';
import { LoadingSkeleton } from '../../Components/index.js';
import { ListingCard } from './ListingCard.js';

/**
 * ListingGrid - Responsive grid of listing cards
 */
export function ListingGrid() {
  if (vm.isLoading && vm.listings.length === 0) {
    return LoadingSkeleton();
  }

  return VStack({ spacing: 24 },
    // Grid - Responsive columns based on viewport width
    // Small screen (<480px): 1 card, Tablet (<1024px): 2 cards, Desktop: up to 8 cards
    Group(
      ...vm.listings.map(listing => ListingCard(listing))
    )
    .modifier({
      apply(el) {
        el.style.display = 'grid';
        el.style.gridTemplateColumns = `repeat(${vm.gridColumns}, 1fr)`;
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

export default ListingGrid;
