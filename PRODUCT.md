# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Developers on Ubuntu/Linux who routinely run local servers and want to free occupied development ports without guessing PIDs.

## Product Purpose
A minimal, keyboard-first CLI for showing safe-to-manage listening ports and requesting graceful process termination.

## Operating Context
Runs in the user's terminal as a regular user; looks up Linux `/proc` sockets. The accompanying static landing page explains the workflow; its web terminal is illustrative, not connected to local sockets.

## Capabilities and Constraints
- TUI with a single `PORT | PROCESS | PID` table; focus row; multi-selection with Space; Enter followed by y/n confirmation.
- Read-only CLI inspection flags available.
- No sudo, no background service, no npm runtime dependencies.
- Does not stop protected, unknown, foreign or privileged processes; revalidates target state and signals only with SIGTERM.
- Not published to npm Registry; GitHub Pages deployment depends on repository configuration.

## Brand Commitments
Name: PNIX. Copy is restrained and specific. Simplicity is a primary usability constraint.

## Evidence on Hand
Source code, automated tests, example screenshots generated from the TUI renderer. No user testimonials or production performance benchmarks.
