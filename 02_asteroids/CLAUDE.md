# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Asteroids clone in plain HTML5 Canvas + vanilla JS (ES6). No dependencies, bundler, linter, or tests. UI text/comments are in Spanish.

## Run

Open `index.html` directly, or `npx serve .` and visit `http://localhost:3000`.

## Architecture

All logic lives in `game.js` (loaded by `index.html` via a plain `<script>`, `'use strict'`). Top to bottom:

- **Input**: `keys` (held) and `justPressed` (edge-triggered). Read edge presses via `pressed(code)`, which consumes the flag.
- **Entity classes**: `Bullet`, `Asteroid`, `Ship`, `Particle`. Each has `update(dt)`/`draw()` and a `dead` flag; arrays are filtered on `dead` each frame. Entities draw straight to the global `ctx`.
- **Global state**: `ship, bullets, asteroids, particles, score, lives, level`, plus `state` (`'playing' | 'dead' | 'gameover'`) and `deadTimer`. `initGame()` resets everything; `nextLevel()` spawns `3 + level` asteroids.
- **Loop**: `loop(ts)` → `update(dt)` → `draw()`. `dt` is in seconds, clamped to 0.05.

Conventions:
- Canvas is fixed 800x600 (`W`, `H`). The space is toroidal: positions wrap with `wrap(v, max)`.
- Asteroid size is 1/2/3 (small/medium/large). `RADII`, `SPEEDS` and `POINTS` are arrays indexed by size, with index 0 unused. Note `POINTS` gives small asteroids the most points (100), and large the fewest (20).
- Physics uses time-based movement (`* dt`), not per-frame increments.

## Notes

- `README.md` mentions power-ups and the "estrella fugaz" asteroid type, but `game.js` does not currently implement them.
