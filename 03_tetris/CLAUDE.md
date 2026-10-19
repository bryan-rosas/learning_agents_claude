# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tetris clone in plain HTML5 Canvas + vanilla JS (ES6). No dependencies, bundler, linter, or tests. UI text/comments/README are in Spanish. Sibling of `../02_asteroids` (separate project, own CLAUDE.md).

## Run

Open `index.html` directly, or `python3 -m http.server 8000` / `npx serve .` in this directory.

## Architecture

All logic is in `game.js` (plain `<script>`, `'use strict'`), no modules. State is module-level `let` globals: `board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId`.

- `board`: `ROWS x COLS` matrix; `0` = empty, `1-7` = index into `COLORS` / `PIECES` (both 1-indexed, index 0 is `null`).
- Pieces: `{ type, shape, x, y }` with square-matrix shapes; `rotateCW` returns a new matrix. `tryRotate` applies wall kicks `[0,-1,1,-2,2]` on x only.
- Flow: `init()` → `loop(ts)` (rAF, accumulates `dropAccum`, gravity step every `dropInterval` ms) → `lockPiece()` = `merge()` → `clearLines()` → `spawn()`. `spawn()` promotes `next` to `current` and calls `endGame()` if it collides immediately.
- `clearLines` owns level/speed progression: level = `floor(lines/10)+1`, `dropInterval = max(100, 1000 - (level-1)*90)`, score = `LINE_SCORES[n] * level`. Soft drop +1/row, hard drop +2/cell.
- Rendering: `draw()` repaints the whole board each frame (grid, board, ghost via `ghostY()` at alpha 0.2, current piece). `drawBlock(context, x, y, colorIndex, size, alpha)` is shared by the main canvas and the NEXT preview canvas (`drawNext`). HUD is DOM (`updateHUD`); pause/game-over use the `#overlay` element toggled with the `hidden` class.
- Input: single `keydown` listener (Arrows, `X`, Space, `P`). Movement is not tied to the loop, so it applies immediately. It returns early when `e.target` is an `<input>` (name field).
- Start/records (section `// ---- Tabla de records local ----` at the bottom of `game.js`): the script ends with `showStart()` (sets `gameOver = true`, shows overlay with "Jugar"), not `init()`; `#restart-btn` → `init`. `setOverlayMode('start'|'gameover'|'pause')` toggles `#name-form`, `#overlay-msg`, `#records` and the button text; `endGame()`/`togglePause()` call it. `endGame()` also calls `saveStats()`; in gameover mode the name form appears if `qualifies(score)` (no autofocus on purpose). `#restart-btn` blurs itself on click so Enter/Space during play can't re-trigger `init`.
- Combo: `clearLines` → `updateCombo(cleared)`; `combo` = consecutive locks that cleared lines, `maxCombo` per game (reset in `init`). `combo, maxCombo` are declared next to the other state globals; `highlightIdx` (row to highlight) lives in the records section.
- Storage: `localStorage['tetris.records']` = top 5 `{name, score, lines, maxCombo, date}` sorted desc; `localStorage['tetris.stats']` = `{bestCombo, maxLines}` across all games. Always go through `readJSON`/`writeJSON` (try/catch for corrupt JSON / unavailable storage). Table rows are built with `textContent` (names are user input).
- CSS: `.overlay-box .hidden` uses `!important` so it beats id selectors like `#name-form { display:flex }`.

## Gotchas

- Canvas size in `index.html` (`#board` 300x600, `#next-canvas` 120x120) must match `COLS*BLOCK` x `ROWS*BLOCK` if those constants change.
- `togglePause()` shows the overlay on pause but never re-adds `hidden` on resume.
- `README.md` describes the intended behavior in more detail (controls table, tunable constants); its tree says `03-tetris/` but the folder is `03_tetris`.
