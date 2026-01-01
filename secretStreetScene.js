// ---------- secretStreet.js ----------
// Hidden “Secret Street” scene unlocked via the diner napkin directions

import { drawSceneImage, fadeOverlay } from './renderUtils.js';
import { drawBox, drawTextCentered } from './ui.js';
import { OfficeScene } from './office.js';

export class SecretStreetScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    // Background image
    this.bg = new Image();
    this.bg.src = 'assets/secretstreet.png';  // <-- add this PNG to assets folder

    // A bit of atmospheric text for the location
    this.descLines = [
      "The street is silent and still.",
      "No wind. No traffic. No people.",
      "Just the faint hum of something unseen beneath the pavement.",
      "You hear something moving around in an adjacent alleyway.",
      "Just a cat knocking over a garbage can lid.",
      "You decide to take the alley, thinking that maybe you'll find something there."
    ];
  }

  init() {
    this.fade = 1;
  }

  update(dt) {
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 400);
  }

  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;

    // Background
    if (this.bg.complete && this.bg.naturalWidth > 0) {
      drawSceneImage(ctx, this.bg, ctx.canvas);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    // Title
    ctx.font = '28px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText("Secret Street", W / 2, 80);

    // Description panel
    drawBox(ctx, W / 2 - 400, H - 260, 800, 160, 'rgba(0,0,0,0.7)', '#fff');

    ctx.font = '22px "Pixel-Regular", monospace';
    let y = H - 220;
    this.descLines.forEach(line => {
      ctx.fillText(line, W / 2, y);
      y += 36;
    });

    drawTextCentered(ctx, 'Press ESC to return', H - 50, '#aaa', 18);

    fadeOverlay(ctx, this.fade);
  }

  handleInput(e) {
    const key = e.key.toLowerCase();

    if (key === 'escape') {
      this.manager.set(new OfficeScene(this.manager));
    }
  }
}
