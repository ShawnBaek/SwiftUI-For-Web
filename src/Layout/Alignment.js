/**
 * Alignment - Alignment options for layout containers.
 *
 * Matches SwiftUI's Alignment and HorizontalAlignment/VerticalAlignment types.
 *
 * @example
 * VStack({ alignment: Alignment.leading })
 * HStack({ alignment: Alignment.top })
 */

/**
 * Horizontal alignment options for VStack.
 */
export const HorizontalAlignment = {
  /** Align to the leading edge (left in LTR) */
  leading: 'leading',
  /** Align to center */
  center: 'center',
  /** Align to the trailing edge (right in LTR) */
  trailing: 'trailing',
};

/**
 * Vertical alignment options for HStack.
 */
export const VerticalAlignment = {
  /** Align to the top */
  top: 'top',
  /** Align to center */
  center: 'center',
  /** Align to the bottom */
  bottom: 'bottom',
  /** Align to the first text baseline */
  firstTextBaseline: 'firstTextBaseline',
  /** Align to the last text baseline */
  lastTextBaseline: 'lastTextBaseline',
};

/**
 * Combined alignment for ZStack and frame alignment.
 */
export const Alignment = {
  // Horizontal alignments (for VStack)
  leading: HorizontalAlignment.leading,
  center: HorizontalAlignment.center,
  trailing: HorizontalAlignment.trailing,

  // Vertical alignments (for HStack)
  top: VerticalAlignment.top,
  bottom: VerticalAlignment.bottom,

  // Combined alignments (for ZStack and frame)
  topLeading: 'topLeading',
  topCenter: 'top',
  topTrailing: 'topTrailing',
  centerLeading: 'centerLeading',
  centerCenter: 'center',
  centerTrailing: 'centerTrailing',
  bottomLeading: 'bottomLeading',
  bottomCenter: 'bottom',
  bottomTrailing: 'bottomTrailing',

  // Baseline alignments
  firstTextBaseline: VerticalAlignment.firstTextBaseline,
  lastTextBaseline: VerticalAlignment.lastTextBaseline,
};

/**
 * Converts alignment value to CSS flexbox align-items value.
 *
 * @param {string} alignment - Alignment value
 * @param {string} axis - 'horizontal' or 'vertical'
 * @returns {string} CSS align-items value
 */
export function alignmentToCSS(alignment, axis = 'horizontal') {
  if (axis === 'horizontal') {
    // For VStack (horizontal alignment of items in vertical stack)
    switch (alignment) {
      case 'leading':
      case 'topLeading':
      case 'centerLeading':
      case 'bottomLeading':
        return 'flex-start';
      case 'trailing':
      case 'topTrailing':
      case 'centerTrailing':
      case 'bottomTrailing':
        return 'flex-end';
      case 'center':
      case 'top':
      case 'bottom':
      case 'topCenter':
      case 'centerCenter':
      case 'bottomCenter':
      default:
        return 'center';
    }
  } else {
    // For HStack (vertical alignment of items in horizontal stack)
    switch (alignment) {
      case 'top':
      case 'topLeading':
      case 'topCenter':
      case 'topTrailing':
        return 'flex-start';
      case 'bottom':
      case 'bottomLeading':
      case 'bottomCenter':
      case 'bottomTrailing':
        return 'flex-end';
      case 'firstTextBaseline':
        return 'baseline';
      case 'lastTextBaseline':
        return 'last baseline';
      case 'center':
      case 'leading':
      case 'trailing':
      case 'centerLeading':
      case 'centerCenter':
      case 'centerTrailing':
      default:
        return 'center';
    }
  }
}

/**
 * Converts alignment to CSS justify-content value for ZStack positioning.
 *
 * @param {string} alignment - Alignment value
 * @returns {Object} CSS justify-content and align-items values
 */
export function alignmentToPosition(alignment) {
  const positions = {
    topLeading: { justifyContent: 'flex-start', alignItems: 'flex-start' },
    top: { justifyContent: 'center', alignItems: 'flex-start' },
    topTrailing: { justifyContent: 'flex-end', alignItems: 'flex-start' },
    centerLeading: { justifyContent: 'flex-start', alignItems: 'center' },
    center: { justifyContent: 'center', alignItems: 'center' },
    centerTrailing: { justifyContent: 'flex-end', alignItems: 'center' },
    bottomLeading: { justifyContent: 'flex-start', alignItems: 'flex-end' },
    bottom: { justifyContent: 'center', alignItems: 'flex-end' },
    bottomTrailing: { justifyContent: 'flex-end', alignItems: 'flex-end' },
    leading: { justifyContent: 'flex-start', alignItems: 'center' },
    trailing: { justifyContent: 'flex-end', alignItems: 'center' },
  };

  return positions[alignment] || positions.center;
}

export default Alignment;
