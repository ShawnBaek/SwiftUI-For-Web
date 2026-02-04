/**
 * Logo Component - StayFinder brand logo with SVG icon
 */

import SwiftUI from '../../../src/index.js';
const { HStack, Text, Font, Color, View } = SwiftUI;

// Airbnb-style logo icon (simplified rausch/belo shape)
function LogoIcon(size = 32) {
  return new View().modifier({
    apply(el) {
      el.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C12.5 2 10 5 10 8c0 2.5 1.5 5 3.5 7.5C11 18 8 22 8 25c0 3 2.5 5 5 5 1.5 0 3-0.5 3-0.5s1.5 0.5 3 0.5c2.5 0 5-2 5-5 0-3-3-7-5.5-9.5C20.5 13 22 10.5 22 8c0-3-2.5-6-6-6zm0 4c1.5 0 2 1 2 2s-0.5 2.5-2 4.5c-1.5-2-2-3.5-2-4.5s0.5-2 2-2zm0 12c2 2.5 4 5 4 7 0 1.5-1 2-2 2-0.5 0-1-0.1-2-0.5-1 0.4-1.5 0.5-2 0.5-1 0-2-0.5-2-2 0-2 2-4.5 4-7z" fill="#FF385C"/>
        </svg>
      `;
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.flexShrink = '0';
    }
  });
}

export function Logo() {
  return HStack({ spacing: 6 },
    LogoIcon(32),
    Text('stayFinder')
      .font(Font.system(22, Font.Weight.bold))
      .foregroundColor(Color.hex('#FF385C'))
  )
  .modifier({
    apply(el) {
      el.style.cursor = 'pointer';
    }
  });
}

export default Logo;
