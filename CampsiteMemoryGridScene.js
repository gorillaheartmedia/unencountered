// ---------- CampsiteMemoryGridScene.js ----------
// Campsite memory puzzle with:
// - 6x6 maze (medium density)
// - Fog-of-war (radius 1 around the player)
// - 12 distinct symbol types (all unique per round)
// - Round lengths: 3 -> 4 -> 5
//
// Flow (scene-based):
// 1) For each round:
//    - Generate a maze (player always has at least one exit).
//    - Scatter unique symbols on walkable tiles (sequence + red herrings).
//    - Flash the sequence OFF-GRID at the top.
//    - Player explores under fog and selects symbols in order.
//    - Wrong selection => short message + round reset (new maze + new symbols).
// 2) On round completion, show a short transition message, then:
//    - Round 0 -> CampsiteScene (matchbook)
//    - Round 1 -> CliffScene
//    - Round 2 -> CrashSiteScene (crystal)
// 3) After leaving CrashSiteScene (ESC), puzzle is considered complete.
// 4) ESC in the puzzle only allows exit if all clues are found and puzzle is complete.

import { getLayout } from './layout.js';
import { drawBox, drawTextCentered } from './ui.js';
import { fadeOverlay } from './renderUtils.js';

import { CampsiteScene } from './campsiteScene.js';
import { CliffScene } from './cliffScene.js';
import { CrashSiteScene } from './crashSiteScene.js';

export class CampsiteMemoryGridScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    // ❗ No office keybar in this puzzle
    this.canShowKeyBar = false;

    // Grid size
    this.rows = 6;
    this.cols = 6;

    // Player position
    this.playerRow = 3;
    this.playerCol = 3;

    // Fog
    this.fogRadius = 1;
    this.revealed = this.createRevealedGrid();

    // Maze: 0 = floor, 1 = wall
    this.maze = this.createEmptyMaze();

    // Rounds: sequence lengths 3 -> 4 -> 5
    this.roundLengths = [3, 4, 5];

    // Load current round from localStorage (0..3 where 3 = finished)
    const storedRound = parseInt(localStorage.getItem('memoryPuzzleRound') || '0', 10);
    this.currentRound = isNaN(storedRound) ? 0 : storedRound;

    // Total symbol count per round (sequence + red herrings)
    this.symbolCounts = [8, 10, 12];

    // 12 distinct symbols — all visually distinct silhouettes
    this.shapeTypes = [
      'tent',       // triangle + doorway
      'match',      // stick + flame
      'cliff',      // ground + drop
      'crater',     // double ring
      'distortion', // spiral
      'star',       // classic star
      'circle',     // circle outline
      'square',     // square outline
      'triangle',   // simple triangle
      'diamond',    // rotated square
      'cross',      // plus sign
      'wave'        // sine-like wave
    ];

    // Symbols placed on grid: { row, col, shape, selected }
    this.symbols = [];

    // Sequence: array of indices into this.symbols
    this.sequence = [];
    this.inputIndex = 0;

    // Modes: flash | explore | transition
    this.mode = 'flash';

    // Flash sequence state
    this.flashIndex = 0;
    this.flashPhase = 'on';
    this.flashTimer = 0;
    this.FLASH_ON_TIME = 450;
    this.FLASH_OFF_TIME = 180;

    // Failure state
    this.failureMessage = null;
    this.failureTimer = 0;
    this.FAILURE_DISPLAY_TIME = 700;

    // Transition after completing a round
    this.transitionTimer = 0;
    this.TRANSITION_TIME = 1000; // ms
    this.transitionText = '';
  }

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  init() {
    this.fade = 1;

    // If puzzle already complete, bounce out immediately
    if (localStorage.getItem('memoryPuzzleComplete') === 'true') {
      import('./office.js').then(({ OfficeScene }) => {
        this.manager.set(new OfficeScene(this.manager));
      });
      return;
    }

    // Reload current round index from storage (in case scenes updated it)
    const storedRound = parseInt(localStorage.getItem('memoryPuzzleRound') || '0', 10);
    this.currentRound = isNaN(storedRound) ? 0 : storedRound;

    this.mode = 'flash';
    this.playerRow = 3;
    this.playerCol = 3;
    this.revealed = this.createRevealedGrid();
    this.maze = this.createEmptyMaze();
    this.prepareRound();
  }

  createRevealedGrid() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
  }

  createEmptyMaze() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 0)
    );
  }

  resetFogAndPlayer() {
    this.playerRow = 3;
    this.playerCol = 3;
    this.revealed = this.createRevealedGrid();
    this.revealAroundPlayer();
  }

  // -------------------------------------------------------------
  // ROUND SETUP (maze + symbols + sequence)
  // -------------------------------------------------------------
  prepareRound() {
    // If we've somehow exceeded defined rounds, just mark complete and exit
    if (this.currentRound >= this.roundLengths.length) {
      localStorage.setItem('memoryPuzzleComplete', 'true');
      import('./office.js').then(({ OfficeScene }) => {
        this.manager.set(new OfficeScene(this.manager));
      });
      return;
    }

    const seqLen = this.roundLengths[this.currentRound];
    const totalSymbols = this.symbolCounts[this.currentRound];

    // Generate a new maze
    this.generateMazeMediumDensity();
    this.ensurePlayerHasExit();

    // Reset fog + player after maze so reveal makes sense
    this.resetFogAndPlayer();

    // Collect walkable cells
    const walkableCells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.maze[r][c] === 0) {
          // Avoid putting symbol on player start to keep that tile clean
          if (!(r === this.playerRow && c === this.playerCol)) {
            walkableCells.push({ r, c });
          }
        }
      }
    }

    // Shuffle walkable cells
    for (let i = walkableCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [walkableCells[i], walkableCells[j]] = [walkableCells[j], walkableCells[i]];
    }

    // Determine how many symbols we can actually place
    const maxSymbols = Math.min(
      totalSymbols,
      walkableCells.length,
      this.shapeTypes.length
    );

    // Create a unique shape list for THIS round
    const shapePool = [...this.shapeTypes];
    for (let i = shapePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shapePool[i], shapePool[j]] = [shapePool[j], shapePool[i]];
    }
    const chosenShapes = shapePool.slice(0, maxSymbols);

    // Place symbols with unique shapes
    this.symbols = [];
    for (let i = 0; i < maxSymbols; i++) {
      const cell = walkableCells[i];
      this.symbols.push({
        row: cell.r,
        col: cell.c,
        shape: chosenShapes[i],
        selected: false
      });
    }

    // Build sequence from distinct symbol indices
    this.sequence = [];
    const indices = [...Array(this.symbols.length).keys()];
    const seqLength = Math.min(seqLen, this.symbols.length);
    for (let i = 0; i < seqLength && indices.length > 0; i++) {
      const pickIndex = Math.floor(Math.random() * indices.length);
      this.sequence.push(indices[pickIndex]);
      indices.splice(pickIndex, 1);
    }

    // Flash state
    this.flashIndex = 0;
    this.flashPhase = 'on';
    this.flashTimer = 0;
    this.inputIndex = 0;
    this.failureMessage = null;
    this.failureTimer = 0;
    this.mode = 'flash';
  }

  // -------------------------------------------------------------
  // MAZE GENERATION (medium-density random-walls, fully connected)
  // -------------------------------------------------------------
  generateMazeMediumDensity() {
    // Start with all floor
    this.maze = this.createEmptyMaze();

    // Reserve player start as guaranteed floor
    const reserved = new Set();
    reserved.add(`${this.playerRow},${this.playerCol}`);

    const totalCells = this.rows * this.cols;
    const targetWalls = Math.floor(totalCells * 0.35); // medium density ~35%

    const cells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const key = `${r},${c}`;
        if (!reserved.has(key)) {
          cells.push({ r, c });
        }
      }
    }

    // Shuffle candidate cells
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let wallsPlaced = 0;

    for (let i = 0; i < cells.length && wallsPlaced < targetWalls; i++) {
      const { r, c } = cells[i];

      // Tentatively place a wall
      this.maze[r][c] = 1;

      // If maze becomes disconnected, revert
      if (!this.isMazeConnectedFromPlayer()) {
        this.maze[r][c] = 0;
      } else {
        wallsPlaced++;
      }
    }
  }

  // Ensure the player isn't boxed in with zero exits
  ensurePlayerHasExit() {
    const r = this.playerRow;
    const c = this.playerCol;

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    let exits = 0;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
      if (this.maze[nr][nc] === 0) exits++;
    }

    if (exits === 0) {
      // Force one random neighbor to be floor
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        this.maze[nr][nc] = 0;
      }
    }
  }

  // BFS connectivity: ensure all floor tiles reachable from player start
  isMazeConnectedFromPlayer() {
    const visited = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );

    let sr = this.playerRow;
    let sc = this.playerCol;

    if (this.maze[sr][sc] === 1) {
      // If somehow player cell is wall (shouldn't be), pick any floor
      let found = false;
      for (let r = 0; r < this.rows && !found; r++) {
        for (let c = 0; c < this.cols && !found; c++) {
          if (this.maze[r][c] === 0) {
            sr = r;
            sc = c;
            found = true;
          }
        }
      }
      if (!found) return false;
    }

    const queue = [{ r: sr, c: sc }];
    visited[sr][sc] = true;

    const drdc = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      for (const [dr, dc] of drdc) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr < 0 ||
          nr >= this.rows ||
          nc < 0 ||
          nc >= this.cols ||
          visited[nr][nc]
        ) {
          continue;
        }
        if (this.maze[nr][nc] === 0) {
          visited[nr][nc] = true;
          queue.push({ r, c: nc, r: nr });
        }
      }
    }

    // Check all floor tiles are visited
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.maze[r][c] === 0 && !visited[r][c]) {
          return false;
        }
      }
    }

    return true;
  }

  // -------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }

    if (this.mode === 'flash') {
      this.updateFlash(dt);
    } else if (this.mode === 'explore') {
      this.updateFailure(dt);
    } else if (this.mode === 'transition') {
      this.updateTransition(dt);
    }
  }

  updateFlash(dt) {
    if (this.flashIndex >= this.sequence.length) {
      this.mode = 'explore';
      this.inputIndex = 0;
      return;
    }

    this.flashTimer += dt;
    if (this.flashPhase === 'on') {
      if (this.flashTimer >= this.FLASH_ON_TIME) {
        this.flashPhase = 'off';
        this.flashTimer = 0;
      }
    } else {
      if (this.flashTimer >= this.FLASH_OFF_TIME) {
        this.flashIndex++;
        this.flashTimer = 0;
        this.flashPhase = 'on';
      }
    }
  }

  updateFailure(dt) {
    if (!this.failureMessage) return;
    this.failureTimer += dt;
    if (this.failureTimer >= this.FAILURE_DISPLAY_TIME) {
      this.prepareRound();
    }
  }

  updateTransition(dt) {
    this.transitionTimer += dt;
    if (this.transitionTimer >= this.TRANSITION_TIME) {
      this.loadSceneForRound();
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);

    drawBox(ctx, x, y, w, h, 'rgba(0,0,0,0.9)', '#ffffff');
    drawTextCentered(ctx, 'Campsite — Labyrinth Memory', y + 50, '#ffffff', 26);

    if (this.mode === 'transition') {
      this.renderTransition(ctx, x, y, w, h);
      fadeOverlay(ctx, this.fade);
      return;
    }

    const gridHeight = h - 260;
    const tileSize = Math.min(w / this.cols, gridHeight / this.rows);
    const gridW = tileSize * this.cols;
    const gridH = tileSize * this.rows;
    const startX = x + (w - gridW) / 2;
    const startY = y + 120;

    this.renderFlashStrip(ctx, x, y, w);

    this.renderGrid(ctx, startX, startY, tileSize);

    const infoY = y + h - 80;
    let infoText = '';

    if (this.mode === 'flash') {
      infoText = 'Watch the symbols. Remember their order.';
    } else if (this.mode === 'explore') {
      if (this.failureMessage) {
        infoText = this.failureMessage;
      } else {
        infoText = `Find and select the symbols in order (${this.inputIndex + 1} of ${this.sequence.length}).`;
      }
    }

    if (infoText) {
      drawTextCentered(ctx, infoText, infoY, '#ffffff', 20);
    }

    drawTextCentered(
      ctx,
      '←↑→↓ / WASD: Move    •    ENTER: Select    •    ESC: Leave',
      y + h - 40,
      '#aaaaaa',
      18
    );

    fadeOverlay(ctx, this.fade);
  }

  renderTransition(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;

    const text = this.transitionText || "Something about that night comes back into focus.";

    drawTextCentered(ctx, text, cy, '#ffffff', 22);
  }

  renderFlashStrip(ctx, x, y, w) {
    if (this.mode !== 'flash') return;

    const stripY = y + 90;
    const stripH = 40;

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 40, stripY - stripH / 2, w - 80, stripH);
    ctx.restore();

    if (this.flashIndex < this.sequence.length && this.flashPhase === 'on') {
      const symbolIndex = this.sequence[this.flashIndex];
      const sym = this.symbols[symbolIndex];
      if (sym) {
        const centerX = x + w / 2;
        const size = stripH * 0.35;
        this.drawThemedShape(ctx, sym.shape, centerX, stripY, size, '#ffff66');
      }
    }
  }

  renderGrid(ctx, startX, startY, tileSize) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tx = startX + c * tileSize;
        const ty = startY + r * tileSize;

        const isPlayer = r === this.playerRow && c === this.playerCol;
        const visible = this.revealed[r][c] || isPlayer;

        const isWall = this.maze[r][c] === 1;

        if (!visible) {
          ctx.fillStyle = 'rgba(5,5,10,0.95)';
          ctx.fillRect(tx, ty, tileSize, tileSize);
        } else {
          if (isWall) {
            ctx.fillStyle = 'rgba(10,10,25,0.95)';
          } else {
            ctx.fillStyle = 'rgba(25,25,40,0.9)';
          }
          ctx.fillRect(tx, ty, tileSize, tileSize);
        }

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx, ty, tileSize, tileSize);

        // Draw symbol if present & visible & not a wall
        if (visible && !isWall) {
          const idx = this.symbols.findIndex(
            s => s.row === r && s.col === c
          );
          if (idx >= 0) {
            const sym = this.symbols[idx];
            const cx = tx + tileSize / 2;
            const cy = ty + tileSize / 2;
            const size = tileSize * 0.28;

            let color = '#cccccc';
            const selectedBefore = this.sequence
              .slice(0, this.inputIndex)
              .includes(idx);

            if (selectedBefore) color = '#66ff99';

            this.drawThemedShape(ctx, sym.shape, cx, cy, size, color);
          }
        }

        // Player marker
        if (isPlayer) {
          ctx.save();
          ctx.strokeStyle = '#ffdd55';
          ctx.lineWidth = 3;
          ctx.strokeRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);
          ctx.restore();
        }
      }
    }
  }

  // -------------------------------------------------------------
  // INPUT
  // -------------------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // During transition, ignore input
    if (this.mode === 'transition') {
      return;
    }

    if (key === 'escape') {
      const hasMatchbook = localStorage.getItem('inventory_matchbook') === 'true';
      const hasCrystal = localStorage.getItem('inventory_crystal') === 'true';
      const puzzleComplete = localStorage.getItem('memoryPuzzleComplete') === 'true';

      if (!hasMatchbook || !hasCrystal || !puzzleComplete) {
        // Can't truly walk away yet
        this.failureMessage = "There are still clues out here. I’ll have to come back.";
        this.failureTimer = 0;
        return;
      }

      import('./office.js').then(({ OfficeScene }) => {
        this.manager.set(new OfficeScene(this.manager));
      });
      return;
    }

    if (this.mode === 'flash') {
      // Ignore movement during flash
      return;
    }

    if (this.mode === 'explore') {
      if (key === 'arrowup' || key === 'w') {
        this.tryMove(-1, 0);
        return;
      }
      if (key === 'arrowdown' || key === 's') {
        this.tryMove(1, 0);
        return;
      }
      if (key === 'arrowleft' || key === 'a') {
        this.tryMove(0, -1);
        return;
      }
      if (key === 'arrowright' || key === 'd') {
        this.tryMove(0, 1);
        return;
      }

      if (key === 'enter') {
        this.handleSelect();
        return;
      }
    }
  }

  tryMove(dr, dc) {
    const nr = this.playerRow + dr;
    const nc = this.playerCol + dc;
    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return;
    if (this.maze[nr][nc] === 1) return; // wall
    this.playerRow = nr;
    this.playerCol = nc;
    this.revealAroundPlayer();
  }

  revealAroundPlayer() {
    const r0 = this.playerRow;
    const c0 = this.playerCol;
    for (let dr = -this.fogRadius; dr <= this.fogRadius; dr++) {
      for (let dc = -this.fogRadius; dc <= this.fogRadius; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
        this.revealed[r][c] = true;
      }
    }
  }

  // -------------------------------------------------------------
  // SELECTION
  // -------------------------------------------------------------
  handleSelect() {
    if (this.failureMessage) return;

    const r = this.playerRow;
    const c = this.playerCol;

    const idx = this.symbols.findIndex(
      s => s.row === r && s.col === c
    );

    if (idx === -1) {
      this.triggerFailure("That doesn't belong to the sequence.");
      return;
    }

    const expectedIdx = this.sequence[this.inputIndex];

    if (idx !== expectedIdx) {
      this.triggerFailure("That's not how it happened.");
      return;
    }

    // Correct
    this.symbols[idx].selected = true;
    this.inputIndex++;

    if (this.inputIndex >= this.sequence.length) {
      this.advanceRoundToScene();
    }
  }

  triggerFailure(msg) {
    this.failureMessage = msg;
    this.failureTimer = 0;
  }

  // -------------------------------------------------------------
  // ROUND → TRANSITION → SCENE LOGIC
  // -------------------------------------------------------------
  advanceRoundToScene() {
    // Next round index for when the player returns
    const nextRound = this.currentRound + 1;
    localStorage.setItem('memoryPuzzleRound', String(nextRound));

    // If finishing the last round, mark puzzle complete
    if (this.currentRound >= this.roundLengths.length - 1) {
      localStorage.setItem('memoryPuzzleComplete', 'true');
    }

    // Set a little flavor line based on which memory is surfacing
    if (this.currentRound === 0) {
      this.transitionText = "The campsite comes back in pieces.";
    } else if (this.currentRound === 1) {
      this.transitionText = "The cliff edge pulls itself into focus.";
    } else {
      this.transitionText = "The impact site tears back into view.";
    }

    this.mode = 'transition';
    this.transitionTimer = 0;
  }

  loadSceneForRound() {
    switch (this.currentRound) {
      case 0:
        this.manager.set(new CampsiteScene(this.manager));
        break;
      case 1:
        this.manager.set(new CliffScene(this.manager));
        break;
      case 2:
      default:
        this.manager.set(new CrashSiteScene(this.manager));
        break;
    }
  }

  // -------------------------------------------------------------
  // DISTINCT THEMED / ABSTRACT SHAPES
  // -------------------------------------------------------------
  drawThemedShape(ctx, shape, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    switch (shape) {
      // 1. Tent – triangle with central doorway line
      case 'tent': {
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);        // peak
        ctx.lineTo(cx - size, cy + size); // bottom left
        ctx.lineTo(cx + size, cy + size); // bottom right
        ctx.closePath();
        ctx.stroke();

        // doorway line
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.2);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
        break;
      }

      // 2. Match – vertical stick + flame
      case 'match': {
        // stick
        ctx.beginPath();
        ctx.moveTo(cx, cy + size);
        ctx.lineTo(cx, cy - size * 0.4);
        ctx.stroke();

        // flame (teardrop)
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.4);
        ctx.quadraticCurveTo(
          cx + size * 0.5,
          cy - size * 1.0,
          cx,
          cy - size * 1.2
        );
        ctx.quadraticCurveTo(
          cx - size * 0.5,
          cy - size * 1.0,
          cx,
          cy - size * 0.4
        );
        ctx.closePath();
        ctx.stroke();
        break;
      }

      // 3. Cliff – ground line + sheer drop
      case 'cliff': {
        // ground
        ctx.beginPath();
        ctx.moveTo(cx - size, cy + size * 0.2);
        ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
        ctx.stroke();

        // drop
        ctx.beginPath();
        ctx.moveTo(cx + size * 0.3, cy - size);
        ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
        ctx.stroke();
        break;
      }

      // 4. Crater – ring + inner ring
      case 'crater': {
        ctx.beginPath();
        ctx.ellipse(cx, cy, size, size * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(cx, cy, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      // 5. Distortion – spiral
      case 'distortion': {
        const turns = 2;
        const steps = 40;
        const maxR = size;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = t * turns * Math.PI * 2;
          const r = maxR * t;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      }

      // 6. Star – simple 5-point star
      case 'star': {
        const spikes = 5;
        const outerR = size;
        const innerR = size * 0.45;
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerR;
          y = cy + Math.sin(rot) * outerR;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerR;
          y = cy + Math.sin(rot) * innerR;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      // 7. Circle – outline
      case 'circle': {
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      // 8. Square – outline
      case 'square': {
        ctx.strokeRect(cx - size, cy - size, size * 2, size * 2);
        break;
      }

      // 9. Triangle – simple upright
      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx - size, cy + size);
        ctx.lineTo(cx + size, cy + size);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      // 10. Diamond – rotated square
      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      // 11. Cross – plus sign
      case 'cross': {
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
        break;
      }

      // 12. Wave – sine-like curve
      case 'wave':
      default: {
        ctx.beginPath();
        const steps = 16;
        const width = size * 2;
        const startX = cx - width / 2;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = startX + width * t;
          const y = cy + Math.sin(t * Math.PI * 2) * (size * 0.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}
