# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tetris clone in plain HTML5 Canvas + vanilla JS (ES6). No dependencies, bundler, linter, or tests. UI text/comments/README are in Spanish. Sibling of `../02_asteroids` (separate project, own CLAUDE.md).

## Run

Open `index.html` directly, or `python3 -m http.server 8000` / `npx serve .` in this directory.

## Architecture

All logic is in `game.js` (plain `<script>`, `'use strict'`), no modules. State is module-level `let` globals: `board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`, plus `startLevel` (pause-menu choice, applied by `init()`), `gameStartLevel` (per-game copy used by `clearLines`), and `keysDown`/`blockedKeys` (keys held at resume/restart are ignored until released).

- `board`: `ROWS x COLS` matrix; `0` = empty, `1-7` = index into `COLORS` / `PIECES` (both 1-indexed, index 0 is `null`).
- Pieces: `{ type, shape, x, y }` with square-matrix shapes; `rotateCW` returns a new matrix. `tryRotate` applies wall kicks `[0,-1,1,-2,2]` on x only.
- Flow: `init()` → `loop(ts)` (rAF, accumulates `dropAccum`, gravity step every `dropInterval` ms) → `lockPiece()` = `merge()` → `clearLines()` → `spawn()`. `spawn()` promotes `next` to `current` and calls `endGame()` if it collides immediately.
- `clearLines` owns level/speed progression: level = `max(gameStartLevel, floor(lines/10)+1)`, `dropInterval = intervalFor(level)` = `max(100, 1000 - (level-1)*90)`, score = `LINE_SCORES[n] * level`. Soft drop +1/row, hard drop +2/cell.
- Rendering: `draw()` repaints the whole board each frame (grid, board, ghost via `ghostY()` at alpha 0.2, current piece). `drawBlock(context, x, y, colorIndex, size, alpha)` is shared by the main canvas and the NEXT preview canvas (`drawNext`). HUD is DOM (`updateHUD`); game-over uses `#overlay`, pause uses a separate `#pause-menu` overlay, both toggled with the `hidden` class.
- Input: single `keydown` listener (Arrows, `X`, Space, `P`/`Escape`). While `paused`, all keys go to `handleMenuKey` (↑↓ focus, ←→ start level, P/Esc resume; Enter/Space activate buttons natively) and game keys are blocked. Movement is not tied to the loop, so it applies immediately.
- Pause menu: `togglePause` → `openPauseMenu`/`closePauseMenu`; buttons Reanudar (`togglePause`), Reiniciar (`init`), Ver controles (`toggleControls`), level ◀▶ (`setStartLevel`, clamped 1..`MAX_START_LEVEL`). `init()` also hides the pause menu.

## Gotchas

- Canvas size in `index.html` (`#board` 300x600, `#next-canvas` 120x120) must match `COLS*BLOCK` x `ROWS*BLOCK` if those constants change.
- `README.md` describes the intended behavior in more detail (controls table, tunable constants); its tree says `03-tetris/` but the folder is `03_tetris`.
