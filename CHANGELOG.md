# Changelog

## 0.5.3 — Hero command and npm publishing guide

- Added a copyable npm command directly in the landing-page hero.
- Kept the current package name `portlane-tui`; `portlane` is owned by another npm publisher.
- Added clear maintainer-only npm publish steps without enabling auto-publish in Actions.
- Preserved True Dark colors, light mode, animations and CLI stop behavior.

## 0.5.2 — Neutral dark mode

- Replaced dark-green page surfaces with near-black and graphite grays.
- Kept lime as a small accent for selected states and the brand mark.
- Matched the terminal demo, confirmation dialog, and install panel to the neutral dark palette.
- Preserved light mode, theme persistence, reduced-motion behavior, and all CLI functions.
- No npm publication or GitHub deployment was performed.

## 0.5.1 — Landing page themes

- Added a light/dark theme control in the landing page navigation.
- Remembers the chosen theme and follows the OS preference before the first choice.
- Added restrained hero/terminal reveal and selection feedback, with reduced-motion support.
- Improved dark surfaces for documentation, copy controls, and the install section.
- No CLI signal/safety logic changed. npm publication remains manual.

## 0.5.0 — CLI and website

- Compact multi-selection TUI and explicit y/N confirmation.
- Static landing page with interactive example terminal.
- GitHub Pages deployment workflow.
