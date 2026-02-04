/**
 * Logo Component - StayFinder brand logo
 */

import SwiftUI from '../../../src/index.js';
const { HStack, Text, Font, Color } = SwiftUI;

export function Logo() {
  return HStack({ spacing: 8 },
    Text('🏠').font(Font.system(28)),
    Text('StayFinder')
      .font(Font.system(20, Font.Weight.bold))
      .foregroundColor(Color.hex('#FF385C'))
  );
}

export default Logo;
