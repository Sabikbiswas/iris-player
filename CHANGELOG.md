# Changelog

All notable changes to Iris are listed here. Versions follow [Semantic Versioning](https://semver.org).

## [1.0.0] – 2026-11-09

The first release, submitted to the Video.js Skins Design Challenge. A fixed copy of the drop-in script is in `release/` (`release/iris.js` + `release/iris-chunks/`), served by jsDelivr at `https://cdn.jsdelivr.net/gh/Sabikbiswas/iris-player@v1.0.0/release/iris.js`.

### Added

- The Iris skin for Video.js 10 (`src/video/`): lens play button with aperture blades and a progress ring, volume capsule with ten steps, speed keys from 0.5× to 2×, aperture scrub preview, ten-step loading ring, keyboard feedback on the dial you would have touched, phone layout with bottom sheets.
- `<iris-skin>`, a drop-in element that wraps any Video.js media element (`src/iris.ts`), built as `iris.js`.
- The showcase page (`site/`) and the Video.js skin workbench (`apps/preview/`).

### Showcase

- The footer lens opens as the page ends and settles on the Iris mark.
- Fits any site offers five accents (the navy chip is gone: the skin lifts dark accents to a readable lightness, so it showed as the same blue).
- Quick Device-then-Site picks in Fits any site no longer drop the first choice.
- "Own the source" and the footer link to this repository.

[1.0.0]: https://github.com/Sabikbiswas/iris-player/releases/tag/v1.0.0
