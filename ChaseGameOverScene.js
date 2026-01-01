// ---------- ChaseGameOverScene.js ----------
// Special game-over screen for Secret Street chase puzzle.
// Fades in, shows "GAME OVER", press ENTER returns to main menu.

import { fadeOverlay } from './renderUtils.js';
import { drawTextCentered } from './ui.js';
import { TitleScene } from './titleScene.js';

export class ChaseGameOverScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;          // start black, fade in to reveal text
    this.pulse = 0;         // subtle pulse for "GAME OVER"
  }

  init() {
    this.fade = 1;
    this.pulse = 0;

    if (document?.fonts?.load) {
      document.fonts.load('16px "Pixel-Regular"').catch(() => {});
    }
  }

  update(dt) {
    // fade-in from black
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 700);

    // pulse animation
    this.pulse += dt * 0.004;
  }

  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // solid black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // big game over text (with pulse)
    const pulseSize = 8 * Math.sin(this.pulse);
    drawTextCentered(ctx, 'GAME OVER', H * 0.42, '#fff', 84 + pulseSize);

    drawTextCentered(
      ctx,
      'A lead pipe catches you from behind.',
      H * 0.55,
      '#aaa',
      26
    );
    drawTextCentered(
      ctx,
      'Press ENTER to return to main menu',
      H * 0.68,
      '#fff',
      24
    );

    // fade overlay on top
    fadeOverlay(ctx, this.fade);
  }

  handleInput(e) {
    const key = e.key.toLowerCase();
    if (key === 'enter') {
      this.manager.set(new TitleScene(this.manager));
    }
  }
}
