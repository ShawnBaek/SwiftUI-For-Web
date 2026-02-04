/**
 * CategoryBar Component - Horizontal category filter with SVG icons
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, ScrollView,
  Text, Button, View,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';
import { getCategoryIcon, Icons } from '../../Components/Icons.js';

/**
 * Filter icon component
 */
const FilterIcon = (size = 16, color = '#222222') => new View().modifier({
  apply(el) {
    el.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="4" y1="12" x2="20" y2="12"/>
        <line x1="4" y1="18" x2="20" y2="18"/>
        <circle cx="8" cy="6" r="2" fill="${color}"/>
        <circle cx="16" cy="12" r="2" fill="${color}"/>
        <circle cx="10" cy="18" r="2" fill="${color}"/>
      </svg>
    `;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
  }
});

/**
 * CategoryBar - Horizontal scrolling category filter with filter button
 */
export function CategoryBar() {
  return HStack({ spacing: 0 },
    // Categories scroll
    ScrollView({ axis: 'horizontal', showsIndicators: false },
      HStack({ spacing: vm.isMobile ? 24 : 32 },
        ...vm.categories.map(cat =>
          Button(
            VStack({ spacing: 8 },
              getCategoryIcon(cat.id, 24, vm.selectedCategory === cat.id ? '#222222' : '#717171'),
              Text(cat.name)
                .font(Font.system(12, vm.selectedCategory === cat.id ? Font.Weight.semibold : Font.Weight.regular))
                .foregroundColor(vm.selectedCategory === cat.id ? Color.hex('#222222') : Color.hex('#717171'))
            )
            .padding({ horizontal: 4, vertical: 12 })
            .modifier({
              apply(el) {
                el.style.borderBottom = vm.selectedCategory === cat.id ? '2px solid #222222' : '2px solid transparent';
                el.style.transition = 'border-color 0.2s, opacity 0.2s';
              }
            }),
            () => vm.selectCategory(cat.id)
          )
          .modifier({
            apply(el) {
              el.style.background = 'transparent';
              el.style.border = 'none';
              el.style.cursor = 'pointer';
              el.style.opacity = vm.selectedCategory === cat.id ? '1' : '0.7';
              el.style.transition = 'opacity 0.2s';
              el.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
              el.addEventListener('mouseleave', () => {
                el.style.opacity = vm.selectedCategory === cat.id ? '1' : '0.7';
              });
            }
          })
        )
      )
      .padding({ horizontal: vm.isMobile ? 16 : 24 })
    )
    .modifier({
      apply(el) {
        el.style.flex = '1';
        el.style.overflow = 'hidden';
      }
    }),

    // Filter button (desktop/tablet only)
    !vm.isMobile ?
      Button(
        HStack({ spacing: 8 },
          FilterIcon(16, '#222222'),
          Text('Filters')
            .font(Font.system(14, Font.Weight.medium))
        )
        .padding({ horizontal: 16, vertical: 12 }),
        () => { vm.showFilters = true; }
      )
      .modifier({
        apply(el) {
          el.style.background = 'white';
          el.style.border = '1px solid #DDDDDD';
          el.style.borderRadius = '12px';
          el.style.cursor = 'pointer';
          el.style.marginLeft = '16px';
          el.style.marginRight = vm.isMobile ? '16px' : '24px';
          el.style.flexShrink = '0';
          el.style.transition = 'box-shadow 0.2s, border-color 0.2s';
          el.addEventListener('mouseenter', () => {
            el.style.borderColor = '#222222';
          });
          el.addEventListener('mouseleave', () => {
            el.style.borderColor = '#DDDDDD';
          });
        }
      })
    : null
  )
  .padding({ vertical: 12 })
  .modifier({
    apply(el) {
      el.style.borderBottom = '1px solid #EBEBEB';
      el.style.backgroundColor = 'white';
    }
  });
}

export default CategoryBar;
