/**
 * ListingCard Component - Individual property listing card
 * With SVG icons and Airbnb-style hover effects
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, ZStack, Spacer,
  Text, Button, Image, View,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';

// SVG Heart Icons
const HeartOutline = () => new View().modifier({
  apply(el) {
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(0,0,0,0.5)" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    `;
    el.style.display = 'flex';
  }
});

const HeartFilled = () => new View().modifier({
  apply(el) {
    el.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF385C" stroke="#FF385C" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    `;
    el.style.display = 'flex';
  }
});

// SVG Star Icon
const StarIcon = () => new View().modifier({
  apply(el) {
    el.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#222222">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
  }
});

/**
 * ListingCard - Displays a single property listing
 * @param {Object} listing - Listing data object
 */
export function ListingCard(listing) {
  const isFavorite = vm.favorites.has(listing.id);

  return VStack({ alignment: 'leading', spacing: 8 },
    // Image container with hover effect
    ZStack({ alignment: 'topTrailing' },
      // Main image with hover zoom
      Image(listing.images[0])
        .aspectRatio(1)
        .modifier({
          apply(el) {
            el.style.borderRadius = '12px';
            el.style.objectFit = 'cover';
            el.style.width = '100%';
            el.style.transition = 'transform 0.3s ease';
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
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }
        })
      : null,

      // Favorite button with SVG
      Button(
        isFavorite ? HeartFilled() : HeartOutline(),
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
          el.style.padding = '0';
          el.style.transition = 'transform 0.2s';
          el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.1)';
          });
          el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
          });
        }
      })
    )
    .onTapGesture(() => vm.selectListing(listing))
    .modifier({
      apply(el) {
        el.style.cursor = 'pointer';
        el.style.overflow = 'hidden';
        el.style.borderRadius = '12px';
        // Hover effect for image zoom
        el.addEventListener('mouseenter', () => {
          const img = el.querySelector('img');
          if (img) img.style.transform = 'scale(1.05)';
        });
        el.addEventListener('mouseleave', () => {
          const img = el.querySelector('img');
          if (img) img.style.transform = 'scale(1)';
        });
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
          StarIcon(),
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
