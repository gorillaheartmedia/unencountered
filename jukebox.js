// ---------- jukebox.js ----------
// Jukebox Puzzle Overlay (ENGINE-ALIGNED VERSION)
//
// - Modal overlay (not a scene)
// - Overlay handles ONLY UI + input
// - Completion is announced via event
// - Scene decides what happens next
//
// Events:
//   "jukeboxPuzzleComplete"  (detail: { code })
//
// Controls:
// ← →  switch column
// ↑ ↓  change selection
// ENTER play
// ESC exit (cancel only)

import { drawSceneImage, fadeOverlay } from './renderUtils.js';
import { drawBox, drawTextCentered } from './ui.js';

export class JukeboxPuzzleOverlay {
  constructor(manager) {
    this.name = "JukeboxPuzzle";
    this.manager = manager;

    this.active = false;
    this.fade = 1;

    // -------------------------------------------------
    // Background
    // -------------------------------------------------
    this.bg = new Image();
    this.bg.src = 'assets/jukebox.png';

    // -------------------------------------------------
    // Selector columns
    // -------------------------------------------------
    this.col1 = ['A','B','C','D'];
    this.col2 = ['1','2','3','4','5','6','7','8','9','10'];

    this.index1 = 0;
    this.index2 = 0;
    this.activeColumn = 0;

    // -------------------------------------------------
    // Snippet display
    // -------------------------------------------------
    this.snippet = null;
    this.snippetTimer = 0;

    // -------------------------------------------------
    // Audio
    // -------------------------------------------------
    this.soundNormal = new Audio('assets/sounds/jukebox1.wav');
    this.soundSecret = new Audio('assets/sounds/jukebox2.wav');

    this.soundNormal.preload = 'auto';
    this.soundSecret.preload = 'auto';

    // -------------------------------------------------
    // Song text
    // -------------------------------------------------
    this.songs = this.buildSongs();
  }

  // -------------------------------------------------
  // OVERLAY LIFECYCLE
  // -------------------------------------------------
  init() {
    this.active = true;
    this.fade = 1;

    this.snippet = null;
    this.snippetTimer = 0;

    this.index1 = 0;
    this.index2 = 0;
    this.activeColumn = 0;

    // Reset audio
    this.soundNormal.pause();
    this.soundSecret.pause();
    this.soundNormal.currentTime = 0;
    this.soundSecret.currentTime = 0;

    if (document?.fonts?.load) {
      document.fonts.load('16px "Pixel-Regular"').catch(() => {});
    }
  }

  onClose() {
    this.active = false;

    this.soundNormal.pause();
    this.soundSecret.pause();
    this.soundNormal.currentTime = 0;
    this.soundSecret.currentTime = 0;
  }

  // -------------------------------------------------
  // SONG DATA
  // -------------------------------------------------
  buildSongs() {
    return {
      "A1": "♪ We make songs about night skies. ♪",
      "A2": "♪ Once in a while. ♪",
      "A3": "♪ A point in space. ♪",
      "A5": "♪ The color of grey. ♪",
      "A6": "♪ Paradigm. ♪",
      "A7": "♪ What we can perceive. ♪",
      "A8": "♪ Midnight songs in the alley. ♪",
      "A9": "♪ Thinking things out. ♪",

      "B1": "♪ The place we first met. ♪",
      "B3": "♪ The desert wind hums the same tune every night. ♪",
      "B4": "♪ Over my head. ♪",
      "B5": "♪ Line by line. ♪",
      "B6": "♪ Pictures of the world. ♪",
      "B7": "♪ The morning star in the sky. ♪",
      "B8": "♪ You and I. ♪",
      "B9": "♪ What is to come? ♪",
      "B10": "♪ Possibilities. ♪",

      "C1": "♪ Things that go together. ♪",
      "C2": "♪ Senseless. ♪",
      "C3": "♪ What gives us meaning? ♪",
      "C4": "♪ The black hole in my heart. ♪",
      "C5": "♪ My love, my darling, my life. ♪",
      "C6": "♪ A new dream. ♪",
      "C8": "♪ Face of the storm. ♪",
      "C9": "♪ There was a time long ago. ♪",
      "C10": "♪ Arrangements. ♪",

      "D1": "♪ Infinite combinations. ♪",
      "D2": "♪ In my room. ♪",
      "D3": "♪ The book ends. ♪",
      "D4": "♪ The cat is on the mat. ♪",
      "D6": "♪ Cold pizza. ♪",
      "D9": "♪ Sharp. ♪",
      "D10": "♪ The many ways. ♪",

      // 🌟 SECRET / SOLUTION
      "C7": "♪ Stars of Orion. ♪",

      "DEFAULT": "♪ The jukebox whirs, but the record sounds unfamiliar. ♪"
    };
  }

  // -------------------------------------------------
  // UPDATE
  // -------------------------------------------------
  update(dt) {
    if (!this.active) return;

    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 350);
    }

    if (this.snippetTimer > 0) {
      this.snippetTimer -= dt;
      if (this.snippetTimer <= 0) {
        this.snippet = null;
      }
    }
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  render(ctx) {
    if (!this.active) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    drawSceneImage(ctx, this.bg, ctx.canvas);
    drawTextCentered(ctx, 'JUKEBOX', 70, '#fff', 36);

    this.renderSelector(ctx, W, H);

    if (this.snippet) {
      drawBox(ctx, W / 2 - 420, H * 0.72, 840, 110, 'rgba(0,0,0,0.75)', '#aaa');
      drawTextCentered(ctx, this.snippet, H * 0.77, '#fff', 22);
    }

    fadeOverlay(ctx, this.fade);
  }

  renderSelector(ctx, W, H) {
    const boxW = 500;
    const boxH = 140;
    const x = W / 2 - boxW / 2;
    const y = H * 0.32;

    drawBox(ctx, x, y, boxW, boxH, 'rgba(0,0,0,0.65)', '#aaa');
    drawTextCentered(ctx, 'SELECT A TRACK', y - 40, '#aaa', 22);

    ctx.font = '30px "Pixel-Regular"';
    ctx.textAlign = 'center';

    const colSpacing = boxW / 3;

    const cx1 = x + colSpacing;
    if (this.activeColumn === 0) {
      drawBox(ctx, cx1 - 35, y + 30, 70, 55, 'rgba(255,255,255,0.15)');
    }
    ctx.fillStyle = '#fff';
    ctx.fillText(this.col1[this.index1], cx1, y + 65);

    const cx2 = x + colSpacing * 2;
    if (this.activeColumn === 1) {
      drawBox(ctx, cx2 - 35, y + 30, 70, 55, 'rgba(255,255,255,0.15)');
    }
    ctx.fillStyle = '#fff';
    ctx.fillText(this.col2[this.index2], cx2, y + 65);

    drawTextCentered(
      ctx,
      '←→ Column • ↑↓ Change • ENTER Play • ESC Exit',
      y + boxH + 50,
      '#aaa',
      18
    );
  }

  // -------------------------------------------------
  // INPUT
  // -------------------------------------------------
  handleInput(e) {
    if (!this.active) return;

    const key = e.key.toLowerCase();

    // ESC = cancel only
    if (key === 'escape') {
      this.manager.overlay.hide();
      return;
    }

    // Column select
    if (key === 'arrowleft' || key === 'a') {
      this.activeColumn = Math.max(0, this.activeColumn - 1);
      return;
    }

    if (key === 'arrowright' || key === 'd') {
      this.activeColumn = Math.min(1, this.activeColumn + 1);
      return;
    }

    // Selection
    if (key === 'arrowup' || key === 'w') {
      if (this.activeColumn === 0) {
        this.index1 = (this.index1 + 1) % this.col1.length;
      } else {
        this.index2 = (this.index2 + 1) % this.col2.length;
      }
      return;
    }

    if (key === 'arrowdown' || key === 's') {
      if (this.activeColumn === 0) {
        this.index1 = (this.index1 - 1 + this.col1.length) % this.col1.length;
      } else {
        this.index2 = (this.index2 - 1 + this.col2.length) % this.col2.length;
      }
      return;
    }

    if (key === 'enter') {
      const code = this.col1[this.index1] + this.col2[this.index2];
      this.playSong(code);
    }
  }

  // -------------------------------------------------
  // PLAY SONG
  // -------------------------------------------------
  playSong(code) {
    const snippet = this.songs[code] || this.songs.DEFAULT;
    this.snippet = snippet;
    this.snippetTimer = 2800;

    this.soundNormal.pause();
    this.soundSecret.pause();
    this.soundNormal.currentTime = 0;
    this.soundSecret.currentTime = 0;

    if (code === "C7") {
      this.soundSecret.play().catch(() => {});
      localStorage.setItem('observatory_clue', 'true');

      // ✅ ANNOUNCE COMPLETION — SCENE DECIDES NEXT STEP
      window.dispatchEvent(
        new CustomEvent("jukeboxPuzzleComplete", {
          detail: { code }
        })
      );

      return;
    }

    this.soundNormal.play().catch(() => {});
  }
}
