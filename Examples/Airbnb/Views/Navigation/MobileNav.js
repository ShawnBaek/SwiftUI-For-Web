/**
 * MobileNav Component - Bottom tab navigation for mobile
 */

import SwiftUI from '../../../../src/index.js';
const { VStack, HStack, Text, Button, Font, Color } = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';

/**
 * MobileNav - Bottom tab bar navigation (mobile only)
 */
export function MobileNav() {
  if (!vm.isMobile) return null;

  const tabs = [
    { id: 'explore', icon: '🔍', label: 'Explore' },
    { id: 'wishlists', icon: '❤️', label: 'Wishlists' },
    { id: 'trips', icon: '🗺️', label: 'Trips' },
    { id: 'inbox', icon: '💬', label: 'Inbox' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ];

  return HStack({ spacing: 0 },
    ...tabs.map(tab =>
      Button(
        VStack({ spacing: 4 },
          Text(tab.icon).font(Font.system(22)),
          Text(tab.label)
            .font(Font.system(10))
            .foregroundColor(tab.id === 'explore' ? Color.hex('#FF385C') : Color.hex('#717171'))
        ),
        () => {}
      )
      .modifier({
        apply(el) {
          el.style.flex = '1';
          el.style.background = 'transparent';
          el.style.border = 'none';
          el.style.padding = '8px 0';
          el.style.cursor = 'pointer';
        }
      })
    )
  )
  .modifier({
    apply(el) {
      el.style.borderTop = '1px solid #EBEBEB';
      el.style.backgroundColor = 'white';
      el.style.position = 'sticky';
      el.style.bottom = '0';
      el.style.zIndex = '100';
    }
  });
}

export default MobileNav;
