/**
 * MobileNav Component - Bottom tab navigation for mobile with SVG icons
 */

import SwiftUI from '../../../../src/index.js';
const { VStack, HStack, Text, Button, View, Font, Color } = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';

// SVG Icons for tabs
const TabIcons = {
  explore: (color) => `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  `,
  wishlists: (color) => `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  `,
  trips: (color) => `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `,
  inbox: (color) => `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `,
  profile: (color) => `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    </svg>
  `
};

/**
 * TabIcon component
 */
const TabIcon = (iconId, isActive) => {
  const color = isActive ? '#FF385C' : '#717171';
  return new View().modifier({
    apply(el) {
      el.innerHTML = TabIcons[iconId](color);
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    }
  });
};

/**
 * MobileNav - Bottom tab bar navigation (mobile only)
 */
export function MobileNav() {
  if (!vm.isMobile) return null;

  const tabs = [
    { id: 'explore', label: 'Explore' },
    { id: 'wishlists', label: 'Wishlists' },
    { id: 'trips', label: 'Trips' },
    { id: 'inbox', label: 'Inbox' },
    { id: 'profile', label: 'Profile' }
  ];

  return HStack({ spacing: 0 },
    ...tabs.map(tab =>
      Button(
        VStack({ spacing: 4 },
          TabIcon(tab.id, tab.id === 'explore'),
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
          el.style.transition = 'opacity 0.2s';
          el.addEventListener('mouseenter', () => {
            el.style.opacity = '0.7';
          });
          el.addEventListener('mouseleave', () => {
            el.style.opacity = '1';
          });
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
