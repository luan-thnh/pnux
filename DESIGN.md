# Portlane design system

- **Promise:** Port is always visually dominant, process next, PID last.
- **TUI:** Terminal-native characters, a single restrained green accent, dim metadata, selected-row background, no tabs or panels. Confirm before every signal.
- **Landing page:** Editorial light canvas (`#f5f5ee`) with forest ink (`#142a25`), evergreen section (`#163b2e`) and a pale mint accent (`#bdec8a`). Typography: Manrope for content, DM Mono for commands and terminal data, with system fallbacks.
- **Layout:** Oversized typographic opening, full-width hands-on terminal illustration, linear workflow, honest local install details.
- **Themes:** Light editorial canvas by default; true neutral-dark canvas (`#0c0d0f`) using near-black, slate and graphite surfaces instead of dark green. Green is reserved for tiny brand and selection accents. Theme control is stored per browser and falls back to OS preference; the terminal and confirmation box follow the selected palette.
- **Motion:** Soft hero entrance, one terminal reveal on scroll, and brief control feedback; no looping flourishes. Respect reduced-motion preferences.
- **Accessible operation:** Focus-visible outlines, keyboard-operable interactive demo, real buttons and labeled confirmation.

## Installation command

The landing page hero presents one copyable command in a dark neutral code surface. Until npm publication, explain that `npx portlane-tui` is a post-publication command and point users to the local source install. Do not use `npx portlane`: that npm package belongs to another publisher.
