/**
 * ListingDetail Component - Full listing detail view modal
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, ZStack, Spacer, Divider,
  Text, Button, Image, ScrollView, Group,
  Rectangle, Circle,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';

/**
 * Helper function to get amenity icon
 */
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

/**
 * Booking Card (Desktop) - Sticky booking widget
 */
export function BookingCard(listing) {
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

/**
 * Mobile Booking Bar - Bottom sticky booking bar for mobile
 */
export function MobileBookingBar(listing) {
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

/**
 * ListingDetail - Full screen listing detail modal
 */
export function ListingDetail() {
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
                ...listing.highlights.map(highlight =>
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

export default ListingDetail;
