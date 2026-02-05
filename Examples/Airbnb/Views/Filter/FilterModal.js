/**
 * FilterModal Component - Full filter options modal
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, ZStack, Spacer, Divider, ScrollView,
  Text, Button, TextField, Toggle, Group,
  Rectangle,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';
import { CounterButton } from '../../Components/index.js';

/**
 * FilterModal - Full screen filter options modal
 */
export function FilterModal() {
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

export default FilterModal;
