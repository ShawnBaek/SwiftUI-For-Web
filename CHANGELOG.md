# Changelog

## 2.0.0-alpha.1

- Add SwiftUI-style `.onChange(of:initial:_:)` behavior.
- Add `.searchable(text:placement:prompt:)` with two-way `Binding` updates.
- Add `.sheet(isPresented:onDismiss:content:)` backed by an accessible native dialog.
- Add `accessibilityLabel`, `accessibilityValue`, `accessibilityHint`, and
  `accessibilityIdentifier` modifiers.
- Align the package, runtime, declarations, and documentation version.

Web compatibility note: search placement values are currently styling hints.
The search field is inserted before the modified view's content because the web
platform has no universal navigation-bar placement equivalent.
