// ---------- apartmentHallway.js ----------
// Interactive Apartment Hallway
// - Uses BaseInteractiveScene (VERB-BASED)
// - Rug → key discovery loop
// - Door unlock → apartment interior
// - Fully compatible with InteractionSystem auto-recovery

import { BaseInteractiveScene } from './BaseInteractiveScene.js';
import { ApartmentInteriorScene } from './apartmentInterior.js';
import { drawSceneImage } from './renderUtils.js';
import { OfficeScene } from './office.js';

export class ApartmentHallwayScene extends BaseInteractiveScene {
  constructor(manager) {
    super(manager);

    // -------------------------------------------------
    // Scene identity
    // -------------------------------------------------
    this.sceneType = "interactive";
    this.canMove = false;

    // -------------------------------------------------
    // Persistent state
    // -------------------------------------------------
    this.fade = 1;

    this.hasKey = localStorage.getItem('apartment_key') === 'true';
    this.rugState = Number(localStorage.getItem('rugState') || 0);
    // 0 = untouched
    // 1 = key revealed
    // 2 = key taken

    // -------------------------------------------------
    // Background image
    // -------------------------------------------------
    this.bg = new Image();
    this.updateBackground();

    // -------------------------------------------------
    // Object container
    // -------------------------------------------------
    this.objects = { 0: [] };
  }

  // -------------------------------------------------
  // OBJECT BUILDER
  // -------------------------------------------------
  buildObjects() {
    const list = [];

    // ---- Door ----
    list.push({
      name: 'Door',
      desc: 'A scratched apartment door with a loose nameplate. ALEX ROTH',
      use: () => this.useDoor()
    });

    // ---- Rug ----
    list.push({
      name: 'Rug',
      desc:
        this.rugState === 0
          ? 'A welcome mat that looks like it hides something underneath.'
          : this.rugState === 1
            ? 'The rug is lifted slightly. Something glints beneath it.'
            : 'A plain rug. Whatever was under it is now gone.',
      use: () => this.useRug()
    });

    // ---- Key (only when revealed & not taken) ----
    if (this.rugState === 1 && !this.hasKey) {
      list.push({
        name: 'Key',
        desc: 'A small metal key. Must belong to this apartment.',
        take: () => this.takeKey()
      });
    }

    // ---- Plant ----
    list.push({
      name: 'Plant',
      desc: 'A fake fern that somehow collects real dust.'
    });

    // ---- Hallway ambience ----
    list.push({
      name: 'Hallway',
      desc: 'Dim, quiet, and unnervingly still.'
    });

    return list;
  }

  // -------------------------------------------------
  // BACKGROUND STATE
  // -------------------------------------------------
  updateBackground() {
    if (this.rugState === 0) this.bg.src = 'assets/rug0.png';
    if (this.rugState === 1) this.bg.src = 'assets/rug1.png';
    if (this.rugState === 2) this.bg.src = 'assets/rug2.png';
  }

  // -------------------------------------------------
  // INIT
  // -------------------------------------------------
  init() {
    this.fade = 1;
    this.updateBackground();

    this.objects[0] = this.buildObjects();

    // Ensure pixel font is ready
    if (document?.fonts?.load) {
      document.fonts.load('16px "Pixel-Regular"').catch(() => {});
    }
  }

  // -------------------------------------------------
  // OBJECT SOURCE (required by BaseInteractiveScene)
  // -------------------------------------------------
  getActiveObjects() {
    return this.objects[0];
  }

  // -------------------------------------------------
  // UPDATE
  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 400);
    }
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.imageSmoothingEnabled = false;

    if (this.bg.complete) {
      drawSceneImage(ctx, this.bg, ctx.canvas);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    // 🔑 VERB SYSTEM RENDER
    super.render(ctx);

    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // -------------------------------------------------
  // INPUT
  // -------------------------------------------------
  handleInput(e) {
    if (super.handleInput(e)) return true;

    if (e.key.toLowerCase() === 'escape') {
      this.manager.set(new OfficeScene(this.manager));
      return true;
    }

    return false;
  }

  // -------------------------------------------------
  // DOOR LOGIC
  // -------------------------------------------------
  useDoor() {
    if (this.hasKey) {
      this.interact.dialogueLine = { text: "You unlock the door." };
      this.interact.state = 'dialogue';

      setTimeout(() => {
        this.manager.set(new ApartmentInteriorScene(this.manager));
      }, 900);

      return;
    }

    if (!localStorage.getItem('doorKnocked')) {
      localStorage.setItem('doorKnocked', 'true');
      this.interact.dialogueLine = { text: "You knock... No answer." };
      this.interact.state = 'dialogue';
      return;
    }

    this.interact.dialogueLine = { text: "You try the handle... locked." };
    this.interact.state = 'dialogue';
  }

  // -------------------------------------------------
  // RUG LOGIC
  // -------------------------------------------------
  useRug() {
    if (this.rugState === 2) {
      this.interact.dialogueLine = {
        text: "Just a rug. The key is already in your pocket."
      };
      this.interact.state = 'dialogue';
      return;
    }

    if (this.rugState === 0) {
      this.rugState = 1;
      localStorage.setItem('rugState', '1');
      this.updateBackground();

      this.interact.dialogueLine = {
        text: "You lift the rug... There's a small key underneath."
      };
      this.interact.state = 'dialogue';

      this.objects[0] = this.buildObjects();
      return;
    }

    if (this.rugState === 1 && !this.hasKey) {
      this.interact.dialogueLine = {
        text: "The key glints under the lifted rug."
      };
      this.interact.state = 'dialogue';
    }
  }

  // -------------------------------------------------
  // KEY PICKUP
  // -------------------------------------------------
  takeKey() {
    this.rugState = 2;
    this.hasKey = true;

    localStorage.setItem('rugState', '2');
    localStorage.setItem('apartment_key', 'true');
    localStorage.setItem('inventory_apartmentKey', 'true');

    this.updateBackground();

    // Notify inventory overlay
    window.dispatchEvent(
      new CustomEvent('inventoryUpdate', {
        detail: { item: "Apartment Key" }
      })
    );

    this.interact.dialogueLine = {
      text: "You pick up the key. It feels cold."
    };
    this.interact.state = 'dialogue';

    this.objects[0] = this.buildObjects();
  }
}
