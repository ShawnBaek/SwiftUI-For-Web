# CLAUDE.md

Read [AGENTS.md](AGENTS.md). It is the single source of truth for every contributor, human or agent.

Then follow the reading order it gives:

- [docs/ROADMAP.md](docs/ROADMAP.md): goals, current state, and the phased plan
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layers, invariants, and documented SwiftUI exceptions
- [docs/TESTING.md](docs/TESTING.md): test principles and the required tests

The previous long-form guide (1,617 lines) had become stale and contradicted
AGENTS.md. It was removed; it remains available in the git history.

## Feedback from real use (2026-11-21)

Notes from building and maintaining nativemobile.org (a one-page app site,
about a dozen section files) with this framework. They are observations
from one site, not decisions; ROADMAP.md decides what is built.

What worked

- A section is one file of `VStack` / `HStack` / `Image` calls, so it reads
  like the app's SwiftUI code. Adding a book to a list or a card to a row
  was a one-line change in one place.
- The release builder follows `index.html`, keeps only the framework
  modules the page imports and minifies. A full build takes seconds, which
  kept the edit, build, deploy loop short.

What to improve

1. **No static HTML in the build.** The page body is drawn by JavaScript,
   so the HTML a crawler or `curl` receives holds only the `<head>`. Search
   engines and link previews then rest on the meta tags alone. A release
   option that renders the page once at build time and writes the result
   into `index.html` (the scripts then take over in the browser) would fix
   this without a server.
2. **Files the page does not reference are left out of `dist`.** The
   builder copies what it can reach from `index.html`. A share image named
   only in an `og:image` meta tag, and files such as a search engine
   verification page, had to be copied by a second script. The builder
   should follow `og:image` / `twitter:image` and copy a `public/` folder
   as is.
3. **Outer margins are not SwiftUI's.** A stack does not give a section
   equal side margins the way a SwiftUI screen does; the site needed its
   own container CSS (`max-width`, `margin-inline: auto`) and the left and
   right margins of each section had to be measured by hand. A documented
   page container with safe side padding would remove that work.
4. **Responsive images.** `Image` takes one source. Device screenshots
   needed explicit width and height to avoid layout shift, and there is no
   `srcset` or lazy loading option; both matter for Core Web Vitals on an
   image-heavy landing page.

Open one issue per item before starting work on it, so each is discussed
and sized there.
