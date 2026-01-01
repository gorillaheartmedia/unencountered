// ---------- locationOverlay.js ----------
// Highlightable list with location unlocks and description transitions

import { getLayout } from './layout.js';
import { drawBox, drawTextCentered } from './ui.js';
import { DowntownScene } from './downtown.js';
import { DinerScene } from './diner.js';
import { ApartmentHallwayScene } from './ApartmentHallwayScene.js';
import { WarehouseOfficeScene } from './warehouseOffice.js';
import { ObservatoryMainScene } from './observatoryMain.js';

// Campsite puzzle scene
import { CampsiteMemoryGridScene } from './CampsiteMemoryGridScene.js';

export class LocationOverlay {
  constructor(manager) {
    this.name = 'Location';
    this.manager = manager;
    this.mode = 'list';
    this.cursor = 0;

    this.canShowKeyBar = false;

    // Locations list
    this.locations = [
      {
        name: 'Diner',
        unlocked: false,
        desc: 'A popular diner on the lower side of town. There may be clues here.',
        bg: 'assets/diner_bg.png'
      },
      {
        name: 'Downtown',
        unlocked: false,
        desc: 'A maze of skyscapers and endless dead ends.',
        bg: 'assets/downtown_bg.png'
      },
      {
        name: 'Warehouse',
        unlocked: false,
        desc: 'The warehouse where Dave works. Shipments come and go. The place can be a real madhouse.',
        bg: 'assets/warehouse_bg.png'
      },
      {
        name: 'Apartment',
        unlocked: false,
        desc: 'Alex’s apartment building. The hallway always feels one degree too cold.',
        bg: 'assets/apartment_bg.png'
      },
      {
        name: 'Observatory',
        unlocked: false,
        desc: 'A lonely hilltop dome. This is where Alex works.',
        bg: 'assets/observatory_bg.png'
      },
      {
        name: 'Campsite',
        unlocked: false,
        desc: 'A clearing in the woods where it all began. Maybe we will find out something here.',
        bg: 'assets/memory_campsite.png'
      }
    ];

    // Listen for unlocking events
    window.addEventListener('locationUpdate', () => {
      this.init();
    });
  }

  // ---------- INIT ----------
  init() {
    this.cursor = 0;
    this.mode = 'list';

    const p1 = JSON.parse(localStorage.getItem('phoneFlags') || '{}');
    const p2 = JSON.parse(localStorage.getItem('phoneFlags_phase2') || '{}');
    const flags = { ...p1, ...p2 };

    // Unlock logic
    if (flags.dinerUnlocked) this.unlock('Diner');
    if (flags.downtownUnlocked) this.unlock('Downtown');

    if (
      flags.apartmentUnlocked ||
      localStorage.getItem('apartmentUnlocked') === 'true' ||
      localStorage.getItem('phase2_enteredApartment') === 'true'
    ) {
      this.unlock('Apartment');
    }

    if (
      flags.warehouseUnlocked ||
      localStorage.getItem('warehouseUnlocked') === 'true'
    ) {
      this.unlock('Warehouse');
    }

    if (
      localStorage.getItem('inventory_observatoryPackage') === 'true' ||
      localStorage.getItem('observatoryUnlocked') === 'true'
    ) {
      this.unlock('Observatory');
    }

    // Unlock Campsite only after the assistant directs you there
    if (localStorage.getItem('campsiteUnlocked') === 'true') {
      this.unlock('Campsite');
    }
  }

  unlock(name) {
    const loc = this.locations.find(l => l.name === name);
    if (loc) loc.unlocked = true;
  }

  // ---------- RENDER ----------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);

    drawBox(ctx, x, y, w, h, 'rgba(0,0,0,0.75)', '#fff');
    drawTextCentered(ctx, 'LOCATIONS', y + 60);

    if (this.mode === 'list') return this.renderList(ctx, x, y, w, h);
    if (this.mode === 'description') return this.renderDescription(ctx, x, y, w, h);
  }

  // ---------- LIST MODE ----------
  renderList(ctx, x, y, w, h) {
    const unlocked = this.locations.filter(l => l.unlocked);

    ctx.font = '24px "Pixel-Regular", monospace';
    ctx.textAlign = 'center';

    unlocked.forEach((loc, i) => {
      const lineY = y + 140 + i * 60;

      if (i === this.cursor) {
        drawBox(
          ctx,
          x + w / 2 - 180,
          lineY - 25,
          360,
          50,
          'rgba(255,255,255,0.15)',
          '#fff'
        );
      }

      ctx.fillStyle = '#fff';
      ctx.fillText(loc.name, x + w / 2, lineY);
    });

    drawTextCentered(
      ctx,
      '↑↓ Navigate • ENTER View • ESC Exit',
      y + h - 60,
      '#aaa',
      18
    );
  }

  // ---------- DESCRIPTION MODE ----------
  renderDescription(ctx, x, y, w, h) {
    const loc = this.currentLoc;
    if (!loc) return;

    const bg = new Image();
    bg.src = loc.bg;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.restore();

    drawBox(
      ctx,
      x + 40,
      y + 100,
      w - 80,
      h - 200,
      'rgba(0,0,0,0.7)',
      '#aaa'
    );

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';

    ctx.font = '30px "Pixel-Regular", monospace';
    ctx.fillText(loc.name, x + w / 2, y + 150);

    ctx.font = '20px "Pixel-Regular", monospace';

    const lines = this.wrapText(ctx, loc.desc, w * 0.7);
    let lineY = y + 220;
    lines.forEach(line => {
      ctx.fillText(line, x + w / 2, lineY);
      lineY += 30;
    });

    drawTextCentered(
      ctx,
      'Press ENTER to travel • ESC to return',
      y + h - 60,
      '#aaa',
      18
    );
  }

  // ---------- INPUT ----------
  handleInput(e) {
    const key = e.key.toLowerCase();

    if (key === 'escape') {
      if (this.mode === 'description') {
        this.mode = 'list';
      } else {
        this.manager.overlay.hide();
      }
      return;
    }

    if (this.mode === 'list') {
      const unlocked = this.locations.filter(l => l.unlocked);

      if (key === 'arrowdown' || key === 's')
        this.cursor = (this.cursor + 1) % unlocked.length;

      if (key === 'arrowup' || key === 'w')
        this.cursor = (this.cursor - 1 + unlocked.length) % unlocked.length;

      if (key === 'enter') {
        this.currentLoc = unlocked[this.cursor];
        this.mode = 'description';
      }

      return;
    }

    // ENTER from description -> Travel
    if (this.mode === 'description' && key === 'enter') {
      const loc = this.currentLoc;
      if (!loc) return;

      this.manager.overlay.hide();

      switch (loc.name) {
        case 'Downtown':
          this.manager.set(new DowntownScene(this.manager));
          break;

        case 'Diner':
          this.manager.set(new DinerScene(this.manager));
          break;

        case 'Warehouse':
          this.manager.set(new WarehouseOfficeScene(this.manager));
          break;

        case 'Apartment':
          this.manager.set(new ApartmentHallwayScene(this.manager));
          break;

        case 'Observatory':
          this.manager.set(new ObservatoryMainScene(this.manager));
          break;

        // ⭐ UPDATED: Campsite loads puzzle OR hub depending on completion
        case 'Campsite': {
          const puzzleDone =
            localStorage.getItem('memoryPuzzleComplete') === 'true';

          if (puzzleDone) {
            import('./campsiteScene.js').then(({ CampsiteScene }) => {
              this.manager.set(new CampsiteScene(this.manager));
            });
          } else {
            this.manager.set(new CampsiteMemoryGridScene(this.manager));
          }
          break;
        }
      }
    }
  }

  // ---------- TEXT WRAP ----------
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && current) {
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
