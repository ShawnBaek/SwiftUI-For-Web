/**
 * Header Component - Main app header with adaptive layout
 *
 * Uses SwiftUI-style @Environment(\.horizontalSizeClass) pattern
 * to render different layouts based on screen size.
 */

import SwiftUI from '../../../../src/index.js';
const {
  VStack, HStack, Spacer, Divider,
  Text, Button,
  Circle,
  UserInterfaceSizeClass, UserInterfaceIdiom,
  Color, Font
} = SwiftUI;

import vm from '../../ViewModels/AppViewModel.js';
import { Logo } from '../../Components/index.js';
import { SearchBarDesktop, SearchBarMobile } from './SearchBar.js';

/**
 * Header Actions - Right side of header (user menu, become host)
 * Only shown when horizontal size class is regular (tablet/desktop)
 */
export function HeaderActions() {
  // Only render on regular horizontal size class
  if (vm.horizontalSizeClass === UserInterfaceSizeClass.compact) {
    return null;
  }

  return HStack({ spacing: 8 },
    Button(
      Text('Become a Host')
        .font(Font.system(14, Font.Weight.medium))
        .foregroundColor(Color.hex('#222222')),
      () => {}
    )
    .modifier({
      apply(el) {
        el.style.background = 'transparent';
        el.style.border = 'none';
        el.style.padding = '10px 12px';
        el.style.borderRadius = '22px';
        el.style.cursor = 'pointer';
        el.style.transition = 'background-color 0.2s';
        el.addEventListener('mouseenter', () => {
          el.style.backgroundColor = '#F7F7F7';
        });
        el.addEventListener('mouseleave', () => {
          el.style.backgroundColor = 'transparent';
        });
      }
    }),

    // User menu
    HStack({ spacing: 12 },
      Text('☰').font(Font.system(14)),
      Circle()
        .fill(Color.hex('#717171'))
        .frame({ width: 30, height: 30 })
        .modifier({
          apply(el) {
            el.innerHTML = '<span style="color: white; font-size: 16px;">👤</span>';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
          }
        })
    )
    .padding({ horizontal: 12, vertical: 6 })
    .modifier({
      apply(el) {
        el.style.border = '1px solid #DDDDDD';
        el.style.borderRadius = '22px';
        el.style.cursor = 'pointer';
        el.style.transition = 'box-shadow 0.2s';
        el.addEventListener('mouseenter', () => {
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.boxShadow = 'none';
        });
      }
    })
  );
}

/**
 * Header Component - Adaptive layout using SwiftUI patterns
 *
 * SwiftUI equivalent structure:
 * ```swift
 * struct Header: View {
 *   @Environment(\.horizontalSizeClass) var horizontalSizeClass
 *
 *   var body: some View {
 *     VStack(spacing: 0) {
 *       HStack {
 *         if horizontalSizeClass == .regular {
 *           Logo()
 *         }
 *         Spacer()
 *         if horizontalSizeClass == .regular {
 *           SearchBarDesktop()
 *         }
 *         Spacer()
 *         if horizontalSizeClass == .regular {
 *           HeaderActions()
 *         }
 *       }
 *       if horizontalSizeClass == .compact {
 *         SearchBarMobile()
 *       }
 *       Divider()
 *     }
 *   }
 * }
 * ```
 */
export function Header() {
  // Read size class from Environment (like @Environment(\.horizontalSizeClass))
  const isCompact = vm.horizontalSizeClass === UserInterfaceSizeClass.compact;
  const isRegular = vm.horizontalSizeClass === UserInterfaceSizeClass.regular;

  return VStack({ spacing: 0 },
    HStack({ spacing: 16 },
      // Logo - only shown when horizontalSizeClass == .regular
      isRegular ? Logo() : null,

      Spacer(),

      // Search bar - Desktop version only for regular + mac idiom
      (isRegular && vm.deviceIdiom === UserInterfaceIdiom.mac) ? SearchBarDesktop() : null,

      Spacer(),

      // Right side actions - only shown when horizontalSizeClass == .regular
      HeaderActions()
    )
    .padding({
      horizontal: isCompact ? 16 : 24,
      vertical: 16
    }),

    // Mobile/Tablet search bar - shown when compact OR tablet idiom
    (isCompact || vm.deviceIdiom === UserInterfaceIdiom.pad) ?
      VStack({ spacing: 0 },
        SearchBarMobile()
      )
      .padding({ horizontal: 16, bottom: 12 })
      : null,

    Divider()
  )
  .modifier({
    apply(el) {
      el.style.position = 'sticky';
      el.style.top = '0';
      el.style.backgroundColor = 'white';
      el.style.zIndex = '100';
    }
  });
}

export default Header;
