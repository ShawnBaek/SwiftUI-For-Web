/**
 * ListingCard Component - Individual property listing card
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, ZStack, Spacer,
  Text, Button, Image,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';

/**
 * ListingCard - Displays a single property listing
 * @param {Object} listing - Listing data object
 */
export function ListingCard(listing) {
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

export default ListingCard;
