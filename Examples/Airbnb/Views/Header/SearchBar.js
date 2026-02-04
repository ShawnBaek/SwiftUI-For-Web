/**
 * SearchBar Components - Desktop and Mobile search bar variants
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, Spacer,
  Text, Button,
  Rectangle, Circle,
  ViewThatFits,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';

/**
 * Search Bar Component (Desktop)
 * Full-featured search with location, dates, and guests
 */
export function SearchBarDesktop() {
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

/**
 * Search Bar Component (Mobile)
 * Compact search button for smaller screens
 */
export function SearchBarMobile() {
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
 */
export function AdaptiveSearchBar() {
  return ViewThatFits({ in: 'horizontal' },
    SearchBarDesktop(),
    SearchBarMobile()
  );
}

export default { SearchBarDesktop, SearchBarMobile, AdaptiveSearchBar };
