/**
 * LoadingSkeleton Component - Loading placeholder grid
 */

import SwiftUI from '../../../src/index.js';
const { VStack, Group, Rectangle, Color } = SwiftUI;

import vm from '../ViewModels/AppViewModel.js';

export function LoadingSkeleton() {
  const skeletonCount = vm.isMobile ? 4 : vm.isTablet ? 6 : 12;

  return Group(
    ...Array.from({ length: skeletonCount }, (_, i) =>
      VStack({ alignment: 'leading', spacing: 8 },
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 280 })
          .cornerRadius(12)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          }),
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 20, width: 200 })
          .cornerRadius(4)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          }),
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 16, width: 150 })
          .cornerRadius(4)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          }),
        Rectangle()
          .fill(Color.hex('#F0F0F0'))
          .frame({ height: 16, width: 100 })
          .cornerRadius(4)
          .modifier({
            apply(el) {
              el.classList.add('skeleton');
            }
          })
      )
    )
  )
  .modifier({
    apply(el) {
      el.style.display = 'grid';
      el.style.gridTemplateColumns = `repeat(auto-fill, minmax(${vm.isMobile ? '100%' : '280px'}, 1fr))`;
      el.style.gap = '24px';
      el.style.width = '100%';
      el.style.padding = vm.isMobile ? '16px' : '24px';
    }
  });
}

export default LoadingSkeleton;
