# GSAP — vendored

This directory contains [GSAP 3.13.0](https://gsap.com/) from GreenSock,
distributed under the **GreenSock Standard "No-Charge" License**
(<https://gsap.com/standard-license/>).

In May 2024 Webflow (the current owner of GSAP) made the entire library —
including the previously paid "Club" bonus plugins — free for **all**
uses, commercial included. Mixing it with this project's MIT license is
permitted.

## Why it's here

SwiftUI-For-Web exposes Apple's SwiftUI animation surface
(`withAnimation`, `Animation.spring(...)`, `.transition(...)`, etc.).
GSAP is the internal engine those modifiers route through — chosen for:

- A unified timeline / tween model that maps naturally onto SwiftUI's
  composable animation API.
- Reliable spring physics matching iOS `Animation.spring`.
- Mid-flight interrupt/re-target semantics that CSS transitions and
  WAAPI handle awkwardly.

`src/Animation/Animator.js` is the only file in the framework that
imports GSAP directly. Every other call site goes through `Animator`.
Users authoring against the SwiftUI surface never see, type, or
import `gsap` themselves.

## File

- `gsap.min.js` — 72 KB minified, 28 KB gzipped. Pulled verbatim from
  the official GSAP CDN (`https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js`).
  Do not edit; replace by re-pulling on version bumps.

## Copyright

```
Copyright 2025, GreenSock. All rights reserved.
Subject to the terms at https://gsap.com/standard-license
```
