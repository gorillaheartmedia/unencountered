// ---------- secretStreet.js ----------
// Secret Street fog-of-war maze with fullscreen keycard alley backgrounds
// Flow:
// intro → alley → maze (ONLY if no keycard) → keycard BG → final BG → return
// After keycard is collected: Secret Street becomes one-screen only.

import { drawSceneImage, fadeOverlay } from './renderUtils.js';
import { drawBox, drawTextCentered } from './ui.js';
import { OfficeScene } from './office.js';

// PHASE 2 PHONE SYSTEM
import { PhoneOverlayPhase2 } from './phoneOverlayphase2.js';

// ✅ REQUIRED: phase progression happens here, not in phone
import { PhaseManager } from './phaseManager.js';

export class SecretStreetScene {
  constructor(manager) {
    this.manager = manager;

    // ----- Modes -----
    this.mode = 'intro';
    this.fade = 1;

    // ----- Backgrounds -----
    this.bgIntro = new Image();
    this.bgIntro.src = 'assets/secretStreet.png';

    this.bgAlley = new Image();
    this.bgAlley.src = 'assets/alley.png';

    this.bgKeycard = new Image();
    this.bgKeycard.src = 'assets/keycard_puddle.png';

    this.bgFinal = new Image();
    this.bgFinal.src = 'assets/puddle.png';

    this.currentPostBG = 'keycard';

    // ----- Maze Layout (10×10) -----
    this.maze = [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,1,0,0,0,1,0,1],
      [1,0,1,1,0,1,0,1,0,1],
      [1,0,1,0,0,1,0,0,0,1],
      [1,0,0,0,1,1,1,1,0,1],
      [1,1,1,0,0,0,0,1,0,1],
      [1,0,0,0,1,1,0,1,0,1],
      [1,0,1,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,2,1],
      [1,1,1,1,1,1,1,1,1,1],
    ];

    this.rows = this.maze.length;
    this.cols = this.maze[0].length;

    this.pos = { r: 1, c: 1 };

    this.revealed = [];
    this.initRevealed();

    this.mazeDisabled = false;

    this.toast = null;
    this.toastTimer = 0;

    this.tileSize = 64;

    // Intro dialogue
    this.introQueue = null;
    this.introActive = false;
    this.introLine = null;
  }

  // --------------------------------------------------
  init() {
    this.mode = 'intro';
    this.fade = 1;

    this.pos = { r: 1, c: 1 };
    this.initRevealed();
    this.revealAround(this.pos.r, this.pos.c);

    this.toast = null;
    this.toastTimer = 0;

    if (localStorage.getItem('inventory_keycard') === 'true') {
      this.mazeDisabled = true;
    }

    if (document?.fonts?.load) {
      document.fonts.load('16px "Pixel-Regular"').catch(() => {});
    }

    // One-time intro lines when first entering
    if (!localStorage.getItem('secretStreetIntroSeen')) {
      this.startIntro();
    }
  }

  startIntro() {
    this.introQueue = [
      "This is Where Dave and Sophie said they saw that supicious person.",
      "The streets are empty. No cars, no people, nothing is stirring.",
      "Off in an adjecent alley you hear a trashcan lid fall to the ground...",
      "and an alley cat go scurrying off into the distance.",
      "You think that maybe the alley may hold a clue.."
    ];
    this.introActive = true;
    this.introLine = this.introQueue.shift();
    this.fade = 1;
  }

  initRevealed() {
    this.revealed = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
  }

  // --------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 450);
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast = null;
    }
  }

  showToast(text, ms = 1200) {
    this.toast = text;
    this.toastTimer = ms;
  }

  inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  isWall(r, c) {
    return this.maze[r][c] === 1;
  }

  isKeycardTile(r, c) {
    return this.maze[r][c] === 2;
  }

  revealAround(r, c) {
    const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dr,dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (this.inBounds(nr, nc)) {
        this.revealed[nr][nc] = true;
      }
    }
  }

  // --------------------------------------------------
  // RENDER
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Always draw the intro background behind intro/dialogue
    if (this.bgIntro.complete && this.bgIntro.naturalWidth > 0) {
      drawSceneImage(ctx, this.bgIntro, ctx.canvas);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    // Intro overlay
    if (this.introActive && this.introLine) {
      drawBox(ctx, W / 2 - 420, H - 220, 840, 140, 'rgba(0,0,0,0.78)', '#fff');
      ctx.font = '22px "Pixel-Regular", monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(this.introLine, W / 2, H - 150);
      drawTextCentered(ctx, 'Press ENTER', H - 70, '#aaa', 18);
      fadeOverlay(ctx, this.fade);
      return;
    }

    if (this.mode === 'intro') {
      drawSceneImage(ctx, this.bgIntro, ctx.canvas);
      drawTextCentered(ctx, 'Secret St. is empty… too empty.', H - 160, '#fff', 28);
      drawTextCentered(ctx, 'A metallic clang echoes from an alley.', H - 120, '#aaa', 24);
      drawTextCentered(ctx, 'Press ENTER', H - 70, '#fff', 22);
      fadeOverlay(ctx, this.fade);
      return;
    }

    if (this.mode === 'alley') {
      drawSceneImage(ctx, this.bgAlley, ctx.canvas);
      drawBox(ctx, W/2 - 340, H*0.70, 680, 150, 'rgba(0,0,0,0.70)');
      drawTextCentered(ctx, 'The alley splits into impossible directions…', H*0.76, '#fff', 26);
      drawTextCentered(ctx, 'Press ENTER', H*0.87, '#fff', 22);
      fadeOverlay(ctx, this.fade);
      return;
    }

    if (this.mode === 'maze') {
      drawSceneImage(ctx, this.bgAlley, ctx.canvas);
      this.renderMaze(ctx);
      fadeOverlay(ctx, this.fade);
      return;
    }

    if (this.mode === 'postChase') {
      const hasKeycard = localStorage.getItem('inventory_keycard') === 'true';

      drawSceneImage(
        ctx,
        hasKeycard ? this.bgFinal : this.bgKeycard,
        ctx.canvas
      );

      drawBox(ctx, W/2 - 360, H*0.72, 720, 140, 'rgba(0,0,0,0.75)');

      if (!hasKeycard) {
        drawTextCentered(ctx, 'A dead-end alley… and a puddle.', H*0.78, '#fff', 26);
        drawTextCentered(ctx, 'Something glints inside it.', H*0.82, '#aaa', 22);
        drawTextCentered(ctx, 'Press ENTER to pick up the keycard', H*0.88, '#fff', 22);
      } else {
        drawTextCentered(ctx, 'Nothing else here. Time to get back to the office.', H*0.78, '#fff', 26);
        drawTextCentered(ctx, 'Press ENTER to return to the office.', H*0.84, '#aaa', 22);
      }

      fadeOverlay(ctx, this.fade);
      return;
    }
  }

  // --------------------------------------------------
  renderMaze(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const tile = Math.min(
      Math.floor(W * 0.7 / this.cols),
      Math.floor(H * 0.7 / this.rows)
    );
    this.tileSize = tile;

    const boardW = tile * this.cols;
    const boardH = tile * this.rows;
    const startX = (W - boardW) / 2;
    const startY = (H - boardH) / 2;

    drawBox(ctx, startX - 20, startY - 20, boardW + 40, boardH + 40, 'rgba(0,0,0,0.6)');

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = startX + c * tile;
        const y = startY + r * tile;

        if (!this.revealed[r][c]) {
          ctx.fillStyle = 'rgba(0,0,0,0.92)';
          ctx.fillRect(x, y, tile, tile);
          continue;
        }

        const cell = this.maze[r][c];
        ctx.fillStyle =
          cell === 1 ? 'rgba(15,15,15,0.95)' :
          cell === 2 ? 'rgba(35,35,35,0.90)' :
                       'rgba(35,35,35,0.85)';
        ctx.fillRect(x, y, tile, tile);

        if (cell === 2) {
          ctx.fillStyle = 'rgba(90,140,255,0.38)';
          ctx.fillRect(x+6, y+6, tile-12, tile-12);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(x, y, tile, tile);
      }
    }

    const px = startX + this.pos.c * tile + tile/2;
    const py = startY + this.pos.r * tile + tile/2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py, tile * 0.22, 0, Math.PI * 2);
    ctx.fill();

    drawTextCentered(ctx, 'Navigate the maze.', startY - 60, '#fff', 22);
    drawTextCentered(ctx, 'Arrow keys / WASD • ESC to exit', startY + boardH + 55, '#aaa', 18);

    if (this.toast) {
      drawBox(ctx, W/2 - 260, startY + boardH + 80, 520, 60, 'rgba(0,0,0,0.8)');
      drawTextCentered(ctx, this.toast, startY + boardH + 110, '#fff', 20);
    }
  }

  // --------------------------------------------------
  // INPUT
  handleInput(e) {
    const key = e.key.toLowerCase();

    if (this.introActive) {
      if (key === 'enter' || key === 'escape') {
        if (this.introQueue && this.introQueue.length) {
          this.introLine = this.introQueue.shift();
        } else {
          this.introActive = false;
          this.introLine = null;
          localStorage.setItem('secretStreetIntroSeen', 'true');
        }
      }
      return;
    }

    if (this.mode === 'intro' && key === 'enter') {
      this.mode = 'alley';
      this.fade = 1;
      return;
    }

    if (this.mode === 'alley' && key === 'enter') {
      if (this.mazeDisabled) {
        this.showToast('There’s nothing else down that alley.');
        setTimeout(() => this.manager.set(new OfficeScene(this.manager)), 650);
        return;
      }
      this.mode = 'maze';
      this.fade = 1;
      this.revealAround(this.pos.r, this.pos.c);
      return;
    }

    if (this.mode === 'maze') {
      if (key === 'escape') {
        this.manager.set(new OfficeScene(this.manager));
        return;
      }
      this.handleMazeMove(key);
      return;
    }

    // ✅ PHASE BOUNDARY LIVES HERE
    if (this.mode === 'postChase' && key === 'enter') {
      const hasKeycard = localStorage.getItem('inventory_keycard') === 'true';

      if (!hasKeycard && this.currentPostBG === 'keycard') {
        localStorage.setItem('inventory_keycard', 'true');
        localStorage.setItem('note_keycardFound', 'true');

        const pm = new PhaseManager();
        pm.completePhase('phase1');
        localStorage.setItem('phase1_completed', 'true');

        this.manager.overlay.add('Phone', new PhoneOverlayPhase2(this.manager));

        window.dispatchEvent(new CustomEvent('inventoryUpdate', {
          detail: { item: 'Keycard' }
        }));

        window.dispatchEvent(new CustomEvent('notesUpdate', {
          detail: {
            title: 'Keycard',
            text: 'Pulled a keycard from a puddle in Secret Street. Nothing identifable. No name, no company logo, nothing. It likely opens a door somewhere.'
          }
        }));

        this.showToast('I should call Dave and tell him what I found.');
        this.toastTimer = 2400;

        this.currentPostBG = 'final';
        this.fade = 1;
        this.mazeDisabled = true;
        return;
      }

      if (hasKeycard && this.currentPostBG === 'final') {
        setTimeout(() => this.manager.set(new OfficeScene(this.manager)), 350);
      }
    }
  }

  // --------------------------------------------------
  handleMazeMove(key) {
    const dirs = {
      arrowup: [-1,0], w: [-1,0],
      arrowdown: [1,0], s: [1,0],
      arrowleft: [0,-1], a: [0,-1],
      arrowright: [0,1], d: [0,1],
    };

    if (!(key in dirs)) return;

    const [dr, dc] = dirs[key];
    const nr = this.pos.r + dr;
    const nc = this.pos.c + dc;

    if (!this.inBounds(nr, nc)) return this.showToast('The alley breaks off here.');
    if (this.isWall(nr, nc)) return this.showToast('Blocked by debris.');

    this.pos = { r: nr, c: nc };
    this.revealAround(nr, nc);

    if (this.isKeycardTile(nr, nc)) {
      this.mode = 'postChase';
      this.currentPostBG = 'keycard';
      this.fade = 1;
    }
  }
}
