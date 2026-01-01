// ---------- mapOverlay.js ----------
// Shows unlocked map locations and handles transition descriptions

import { getLayout } from './layout.js';
import { drawBox, drawTextCentered } from './ui.js';
import { DowntownScene } from './downtown.js';

export class MapOverlay {
  constructor(manager) {
    this.name = 'Map';
    this.manager = manager;
    this.mode = 'list'; // 'list' | 'description'
    this.cursor = 0;

    // Base locations (others added dynamically when unlocked)
    this.locations = [
      { 
        name: 'Diner', 
        unlocked: true, 
        desc: 'The local diner — a quiet place where gossip brews faster than coffee.', 
        bg: 'assets/diner_bg.png', 
        scene: 'DinerScene' 
      },
      { 
        name: 'Downtown', 
        unlocked: false, 
        desc: 'The heart of the city — neon lights, endless noise, and a strange stillness tonight.', 
        bg: 'assets/downtown_bg.png', 
        scene: 'DowntownScene' 
      }
    ];
  }

  init() {
    const flags = JSON.parse(localStorage.getItem('phoneFlags') || '{}');

    // Unlock Downtown
    if (flags.downtownUnlocked) {
      const d = this.locations.find(l => l.name === 'Downtown');
      if (d) d.unlocked = true;
    }

    // Unlock Secret Street dynamically
    if (localStorage.getItem('secretStreetUnlocked') === 'true') {
      const exists = this.locations.find(l => l.name === 'Secret St');
      if (!exists) {
        this.locations.push({
          name: 'Secret St',
          unlocked: true,
          desc: 'A narrow, forgotten street hidden between places. The quiet here feels unnatural.',
          bg: 'assets/secretstreet_bg.png',
          scene: 'SecretStreetScene'
        });
      }
    }

    this.mode = 'list';
    this.cursor = 0;
  }

  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);
    drawBox(ctx, x, y, w, h, 'rgba(0,0,0,0.8)', '#fff');
    drawTextCentered(ctx, 'MAP', y + 40);

    const unlocked = this.locations.filter(l => l.unlocked);

    // ---- LOCATION LIST ----
    if (this.mode === 'list') {
      ctx.font = '24px "Pixel-Regular", monospace';
      ctx.textAlign = 'center';

      unlocked.forEach((loc, i) => {
        const lineY = y + 120 + i * 50;

        if (i === this.cursor) {
          drawBox(ctx, x + w / 2 - 180, lineY - 25, 360, 50, 'rgba(255,255,255,0.15)', '#fff');
        }

        ctx.fillStyle = '#fff';
        ctx.fillText(loc.name, x + w / 2, lineY);
      });

      drawTextCentered(ctx, '↑↓ to navigate • ENTER to view • ESC to exit', y + h - 60, '#aaa', 18);
    }

    // ---- DESCRIPTION SCREEN ----
    if (this.mode === 'description') {
      const loc = unlocked[this.cursor];
      if (!loc) return;

      // Background preview
      const bg = new Image();
      bg.src = loc.bg;
      const W = ctx.canvas.width;
      const H = ctx.canvas.height;

      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.restore();

      // Description panel
      drawBox(ctx, x + 40, y + 100, w - 80, h - 200, 'rgba(0,0,0,0.7)', '#aaa');

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '32px "Pixel-Regular", monospace';
      ctx.fillText(loc.name, x + w / 2, y + 150);

      ctx.font = '20px "Pixel-Regular", monospace';
      const lines = this.wrapText(ctx, loc.desc, w * 0.75);
      let lineY = y + 210;

      lines.forEach(line => {
        ctx.fillText(line, x + w / 2, lineY);
        lineY += 28;
      });

      drawTextCentered(ctx, 'Press ENTER to travel • ESC to return', y + h - 60, '#aaa', 18);
    }
  }

  handleInput(e) {
    const key = e.key.toLowerCase();
    const unlocked = this.locations.filter(l => l.unlocked);

    // ---- ESCAPE ----
    if (key === 'escape') {
      if (this.mode === 'description') {
        this.mode = 'list';
      } else {
        this.manager.overlay.active = null;
      }
      return;
    }

    // ---- LIST MODE ----
    if (this.mode === 'list') {
      if (key === 'arrowdown' || key === 's')
        this.cursor = (this.cursor + 1) % unlocked.length;

      if (key === 'arrowup' || key === 'w')
        this.cursor = (this.cursor - 1 + unlocked.length) % unlocked.length;

      if (key === 'enter')
        this.mode = 'description';

      return;
    }

    // ---- DESCRIPTION MODE ----
    if (this.mode === 'description' && key === 'enter') {
      const loc = unlocked[this.cursor];
      if (!loc) return;

      this.manager.overlay.active = null;

      switch (loc.scene) {
        case 'DinerScene':
          import('./diner.js').then(({ DinerScene }) =>
            this.manager.set(new DinerScene(this.manager))
          );
          break;

        case 'DowntownScene':
          this.manager.set(new DowntownScene(this.manager));
          break;

        case 'SecretStreetScene':
          import('./secretStreet.js').then(({ SecretStreetScene }) =>
            this.manager.set(new SecretStreetScene(this.manager))
          );
          break;

        default:
          console.warn('Map scene not implemented:', loc.scene);
      }
    }
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      const width = ctx.measureText(test).width;

      if (width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
    return lines;
  }
}
