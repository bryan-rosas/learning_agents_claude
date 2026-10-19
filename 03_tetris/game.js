'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let combo = 0, maxCombo = 0; // combo actual y mejor combo de la partida

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  updateCombo(cleared);
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = '#22222e';
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  saveStats();
  setOverlayMode('gameover');
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    setOverlayMode('pause');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (!gameOver) animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  combo = 0;
  maxCombo = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  // no capturar teclas mientras se escribe en un input
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  restartBtn.blur(); // evita que Enter/Espacio reactive el botón en partida
  init();
});

// ---- Tabla de records local ----

const RECORDS_KEY = 'tetris.records';
const STATS_KEY = 'tetris.stats';
const MAX_RECORDS = 5;
const NAME_MAX = 12;
const DEFAULT_NAME = 'Jugador';

const overlayMsg = document.getElementById('overlay-msg');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const recordsBox = document.getElementById('records');
const recordsBody = document.getElementById('records-body');
const recordsStats = document.getElementById('records-stats');
const resetRecordsBtn = document.getElementById('reset-records-btn');

let highlightIdx = -1;

// combo = locks consecutivos que limpian líneas
function updateCombo(cleared) {
  if (cleared) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
  } else {
    combo = 0;
  }
}

// lee JSON de localStorage sin romper si está corrupto o no disponible
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* almacenamiento no disponible */ }
}

function loadRecords() {
  const data = readJSON(RECORDS_KEY, []);
  if (!Array.isArray(data)) return [];
  return data
    .filter(r => r && typeof r.name === 'string' && Number.isFinite(r.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECORDS);
}

function loadStats() {
  const s = readJSON(STATS_KEY, null);
  return {
    bestCombo: Number.isFinite(s?.bestCombo) ? s.bestCombo : 0,
    maxLines: Number.isFinite(s?.maxLines) ? s.maxLines : 0,
  };
}

function qualifies(value) {
  const recs = loadRecords();
  return value > 0 && (recs.length < MAX_RECORDS || value > recs[recs.length - 1].score);
}

// inserta el record de la partida actual y devuelve su posición (0-based)
function addRecord(name) {
  const recs = loadRecords();
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  // fecha local YYYY-MM-DD (toISOString usaría UTC)
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const entry = { name, score, lines, maxCombo, date };
  let idx = recs.findIndex(r => score > r.score);
  if (idx === -1) idx = recs.length;
  recs.splice(idx, 0, entry);
  writeJSON(RECORDS_KEY, recs.slice(0, MAX_RECORDS));
  return idx < MAX_RECORDS ? idx : -1;
}

function renderRecords() {
  const recs = loadRecords();
  recordsBody.textContent = '';
  if (!recs.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'records-empty';
    td.textContent = 'Sin records todavía';
    tr.appendChild(td);
    recordsBody.appendChild(tr);
  }
  recs.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (i === highlightIdx) tr.className = 'current';
    // fecha ISO → dd/mm
    const date = typeof r.date === 'string' ? r.date.slice(5, 10).split('-').reverse().join('/') : '';
    for (const v of [i + 1, r.name, r.score.toLocaleString(), r.lines ?? 0, r.maxCombo ?? 0, date]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    recordsBody.appendChild(tr);
  });
  const st = loadStats();
  recordsStats.textContent = `Mejor combo: ${st.bestCombo} · Máx. líneas: ${st.maxLines}`;
}

// configura el overlay según el estado: start | gameover | pause
function setOverlayMode(mode) {
  nameForm.classList.add('hidden');
  overlayMsg.classList.add('hidden');
  recordsBox.classList.toggle('hidden', mode === 'pause');
  restartBtn.textContent = mode === 'start' ? 'Jugar' : 'Reiniciar';
  highlightIdx = -1;
  // sin autofocus: las teclas que el jugador aún pulse no deben ir al input
  if (mode === 'gameover' && qualifies(score)) {
    nameInput.value = DEFAULT_NAME;
    nameForm.classList.remove('hidden');
  }
  if (mode !== 'pause') renderRecords();
}

// actualiza estadísticas históricas al terminar una partida
function saveStats() {
  const st = loadStats();
  writeJSON(STATS_KEY, {
    bestCombo: Math.max(st.bestCombo, maxCombo),
    maxLines: Math.max(st.maxLines, lines || 0),
  });
}

// al enfocar el input se selecciona el texto para sobrescribir "Jugador"
nameInput.addEventListener('focus', () => nameInput.select());

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  if (nameForm.classList.contains('hidden')) return;
  const name = nameInput.value.trim().slice(0, NAME_MAX) || DEFAULT_NAME;
  highlightIdx = addRecord(name);
  nameForm.classList.add('hidden');
  nameInput.blur();
  // -1: otra pestaña llenó el top mientras tanto
  overlayMsg.textContent = highlightIdx === 0 ? '¡Nuevo récord!'
    : highlightIdx > 0 ? `Top ${MAX_RECORDS}: puesto ${highlightIdx + 1}`
    : `No entró en el top ${MAX_RECORDS}`;
  overlayMsg.classList.remove('hidden');
  renderRecords();
});

resetRecordsBtn.addEventListener('click', () => {
  if (!confirm('¿Borrar todos los records?')) return;
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(STATS_KEY);
  } catch { /* almacenamiento no disponible */ }
  highlightIdx = -1;
  renderRecords();
});

// pantalla de inicio: el juego no arranca hasta pulsar "Jugar"
function showStart() {
  gameOver = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  overlayTitle.textContent = 'TETRIS';
  overlayScore.textContent = '';
  setOverlayMode('start');
  overlay.classList.remove('hidden');
}

showStart();
