/**
 * Placement suggestions for `.searchable()`.
 *
 * SwiftUI delegates the final placement to the active container. The web
 * renderer currently treats every value as a hint and places the search field
 * before the modified view's content, while preserving the requested value on
 * `data-search-field-placement` for styling and diagnostics.
 */
export const SearchFieldPlacement = Object.freeze({
  automatic: 'automatic',
  navigationBarDrawer: 'navigationBarDrawer',
  sidebar: 'sidebar',
  toolbar: 'toolbar'
});

export default SearchFieldPlacement;
