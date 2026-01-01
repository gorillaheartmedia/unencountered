// ---------- titleScene.js ----------
// Animated background title screen for Unencountered
// Pure cinematic scene — NO InteractionSystem by design

import { OfficeScene } from './office.js';

export class TitleScene {
  constructor(manager) {
    this.manager = manager;

    this.cursor = 0;
    this.options = [];

    this.scrollY = 0;
    this.fade = 0;
    this.fadeIn = true;
    this.fadingOut = false;

    this.music = null;
    this.bg = null;
  }

  init() {
    this.canShowKeyBar = false;

    this.options = ['Start New Game'];

    this.cursor = 0;

    this.bg = new Image();
    this.bg.src = 'assets/title_screen.png';

    this.music = new Audio('assets/sounds/title.mp3');
    this.music.loop = true;
    this.music.volume = 0.6;
    this.music.play().catch(() => {});

    this.fade = 0;
    this.fadeIn = true;
    this.fadingOut = false;
  }

  update(dt) {
    this.scrollY = (this.scrollY + 20 * dt / 1000) % (this.bg.height || 1);

    if (this.fadeIn && this.fade < 1) {
      this.fade += dt / 1500;
      if (this.fade >= 1) this.fade = 1;
    }

    if (this.fadingOut) {
      this.fade -= dt / 800;
      if (this.fade <= 0) {
        this.fade = 0;
        this._finishTransition();
      }
    }
  }

  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (this.bg.complete && this.bg.naturalWidth > 0) {
      const scale = Math.max(W / this.bg.width, H / this.bg.height);
      const nw = this.bg.width * scale;
      const nh = this.bg.height * scale;
      const dx = (W - nw) / 2;

      ctx.globalAlpha = this.fade;
      ctx.drawImage(this.bg, dx, -this.scrollY, nw, nh);
      ctx.drawImage(this.bg, dx, -this.scrollY + nh, nw, nh);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.font = '72px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('unencountered', W / 2, H * 0.35);

    ctx.font = '28px "Pixel-Regular", monospace';
    this.options.forEach((opt, i) => {
      const y = H * 0.55 + i * 60;
      if (i === this.cursor) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(W / 2 - 180, y - 26, 360, 50);
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(opt, W / 2, y);
    });

    ctx.font = '16px "Pixel-Regular", monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(
      'Press ↑ ↓ to navigate • ENTER to select',
      W / 2,
      H - 60
    );
  }

  handleInput(e) {
    if (this.fadingOut) return;

    const key = e.key.toLowerCase();

    if (key === 'arrowdown' || key === 's') {
      this.cursor = (this.cursor + 1) % this.options.length;
      return;
    }

    if (key === 'arrowup' || key === 'w') {
      this.cursor = (this.cursor - 1 + this.options.length) % this.options.length;
      return;
    }

    if (key === 'enter') {
      // Always start fresh for consistency
      localStorage.clear();
      // Rebuild phone overlay with a clean phase 1 state
      window.dispatchEvent(new Event('phoneUpdate'));
      this._beginFadeOut();
    }
  }

  _beginFadeOut() {
    this.fadingOut = true;
    this.fadeIn = false;

    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
    }
  }

  _finishTransition() {
    this.manager.set(new OfficeScene(this.manager));
  }
}
