// ---------- downtown.js ----------
// Downtown navigation puzzle
// Phase 1: Napkin route → Secret Street
// Phase 5: Observatory route → Final District

import { drawSceneImage, fadeOverlay } from './renderUtils.js';
import { OfficeScene } from './office.js';

export class DowntownScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = false;

    // Starting position: Adleman Blvd
    this.pos = { r: 1, c: 2 };
    this.seq = [];

    this.bg = new Image();
    this.bg.src = 'assets/downtown_street.png';

    this.grid = [
      ['1st Ave', '2nd St', '3rd Blvd', '4th Lane'],
      ['Pine St', 'Maple Ave', 'Adleman Blvd', 'Oak St'],
      ['Elm St', 'Cedar Ave', 'Birch St', 'Chestnut Blvd'],
      ['Spruce St', 'Willow Ln', 'Ash Ave', 'Hidden Blvd']
    ];

    // -------------------------------------------------
    // ROUTES
    // -------------------------------------------------

    // Phase 1 napkin route
    this.routeSecretStreet = ['N','E','S','S','S','W'];

    // Phase 5 observatory route (Assistant → clipboard)
    this.routeFinalDistrict = ['S','E','N','N','N','W'];

    // Flags
    this.secretStreetUnlocked =
      localStorage.getItem('secretStreetUnlocked') === 'true';

    this.finalDistrictUnlocked =
      localStorage.getItem('finalDistrictUnlocked') === 'true';

    this.phase5Ready =
      localStorage.getItem('phase5_ready') === 'true';
  }

  // -------------------------------------------------
  init() {
    this.fade = 1;
    this.seq = [];
    this.pos = { r: 1, c: 2 };

    // If Secret Street already unlocked, rename it
    if (this.secretStreetUnlocked) {
      this.replaceStreet('Ash Ave', 'Secret St');
    }

    // If Phase 5 unlocked, rename final street
    if (this.finalDistrictUnlocked) {
      this.replaceStreet('2nd St', '???');
    }
  }

  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 400);
    }
  }

  // -------------------------------------------------
  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;

    drawSceneImage(ctx, this.bg, ctx.canvas);

    const name = this.grid[this.pos.r][this.pos.c];

    // Location name box
    const boxWidth = 600;
    const boxHeight = 80;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fillRect(W / 2 - boxWidth / 2, 60, boxWidth, boxHeight);
    ctx.strokeRect(W / 2 - boxWidth / 2, 60, boxWidth, boxHeight);

    ctx.font = '42px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, W / 2, 60 + boxHeight / 2);

    // Movement hint
    const hint = '← ↑ ↓ →  Move      ESC  Return';
    ctx.font = '28px "Pixel-Regular", monospace';
    const w2 = ctx.measureText(hint).width;
    const xx = (W - w2) / 2;
    const yy = H - 70;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(xx - 10, yy - 10, w2 + 20, 60);

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(hint, xx, yy + 25);

    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();
    let moved = false;
    let dir = '';

    if (key === 'arrowup' || key === 'w') {
      if (this.pos.r > 0) { this.pos.r--; dir = 'N'; moved = true; }
    }
    if (key === 'arrowdown' || key === 's') {
      if (this.pos.r < 3) { this.pos.r++; dir = 'S'; moved = true; }
    }
    if (key === 'arrowleft' || key === 'a') {
      if (this.pos.c > 0) { this.pos.c--; dir = 'W'; moved = true; }
    }
    if (key === 'arrowright' || key === 'd') {
      if (this.pos.c < 3) { this.pos.c++; dir = 'E'; moved = true; }
    }

    if (key === 'escape') {
      import('./office.js').then(({ OfficeScene }) =>
        this.manager.set(new OfficeScene(this.manager))
      );
      return;
    }

    if (moved) {
      this.seq.push(dir);
      if (this.seq.length > 6) this.seq.shift();

      // ---------------------------------------------
      // PHASE 1: SECRET STREET
      // ---------------------------------------------
      if (
        !this.secretStreetUnlocked &&
        this.seq.join('') === this.routeSecretStreet.join('')
      ) {
        this.secretStreetUnlocked = true;
        localStorage.setItem('secretStreetUnlocked', 'true');

        this.replaceStreet('Ash Ave', 'Secret St');

        import('./secretStreet.js').then(({ SecretStreetScene }) => {
          this.manager.set(new SecretStreetScene(this.manager));
        });
        return;
      }

      // ---------------------------------------------
      // PHASE 5: FINAL DISTRICT
      // ---------------------------------------------
      if (
        this.phase5Ready &&
        !this.finalDistrictUnlocked &&
        this.seq.join('') === this.routeFinalDistrict.join('')
      ) {
        this.finalDistrictUnlocked = true;
        localStorage.setItem('finalDistrictUnlocked', 'true');

        this.replaceStreet('2nd St', '???');

        import('./finalDistrict.js').then(({ FinalDistrictScene }) => {
          this.manager.set(new FinalDistrictScene(this.manager));
        });
      }
    }
  }

  // -------------------------------------------------
  // HELPERS
  // -------------------------------------------------
  replaceStreet(oldName, newName) {
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c] === oldName) {
          this.grid[r][c] = newName;
        }
      }
    }
  }
}
