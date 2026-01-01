// ---------- diner.js ----------
// Interactive diner scene
// Uses BaseInteractiveScene
// Supports room-based Move menu (Booth / Counter / Dining)

import { BaseInteractiveScene } from './BaseInteractiveScene.js';
import { drawSceneImage, fadeOverlay } from './renderUtils.js';
import { OfficeScene } from './office.js';

export class DinerScene extends BaseInteractiveScene {
  constructor(manager) {
    super(manager);

    this.sceneType = "interactive";
    this.canMove = true;

    this.roomIndex = 1;
    this.fade = 1;

    // bind once so we can remove listener safely
    this.onJukeboxComplete = this.onJukeboxComplete.bind(this);

    // -----------------------------
    // Room visuals
    // -----------------------------
    this.rooms = [
      { name: 'Booth Corner', img: new Image(), path: 'assets/diner_right.png' },
      { name: 'Main Counter', img: new Image(), path: 'assets/diner_middle.png' },
      { name: 'Dining Section', img: new Image(), path: 'assets/diner_left.png' }
    ];
    this.rooms.forEach(r => (r.img.src = r.path));

    this.roomNames = ['Booth Corner', 'Main Counter', 'Dining Section'];

    // -----------------------------
    // Waitress visuals
    // -----------------------------
    this.waitressBase = new Image();
    this.waitressBase.src = 'assets/waitress1.png';

    this.waitressTop = new Image();
    this.waitressTop.src = 'assets/waitress.png';

    this.waitressOpacity = 1;
    this.waitressFading = false;

    // -----------------------------
    // Flags
    // -----------------------------
    this.flags = {
      waitressSpoken1: false,
      waitressSpoken2: false,
      boothUsed: false,
      jukeboxFixed: localStorage.getItem('jukeboxFixed') === 'true'
    };

    // -----------------------------
    // Base objects per room
    // -----------------------------
    this.objects = {
      0: [
        {
          name: 'Booth',
          desc: 'A red vinyl booth that’s seen better days.',
          use: () => this.useBooth()
        }
      ],

      1: [
        {
          name: 'Counter',
          desc: 'A long counter lined with barstools.'
        },
        {
          name: 'Waitress',
          desc: 'She moves like she’s serving six tables at once.',
          speak: () => this.getWaitressDialogue()
        }
      ],

      2: [
        {
          name: 'Jukebox',
          desc: () =>
            this.flags.jukeboxFixed
              ? 'The jukebox hums quietly, ready to play.'
              : 'A dusty jukebox with an exposed fuse panel.',
          use: () => this.useJukebox()
        },
        {
          name: 'Old Signage',
          desc: 'They sold burgers for a nickel back in the day…'
        },
        {
          name: 'Clock',
          desc: 'Frozen at 2:13 AM. Batteries must be'
        }
      ]
    };

    // -----------------------------
    // Move override
    // -----------------------------
    const originalTrigger = this.interact.triggerAction.bind(this.interact);
    this.interact.triggerAction = (verb, obj) => {
      if (verb === 'Move' && obj?.moveTarget) {
        this.roomIndex = obj.index;
        this.fade = 1;
        this.interact.state = 'explore';
        return;
      }
      originalTrigger(verb, obj);
    };
  }

  // -------------------------------------------------
  init() {
    this.fade = 1;
    this.roomIndex = 1;

    this.flags.waitressSpoken1 = localStorage.getItem('waitressSpoken1') === 'true';
    this.flags.waitressSpoken2 = localStorage.getItem('waitressSpoken2') === 'true';
    this.flags.boothUsed = localStorage.getItem('boothUsed') === 'true';
    this.flags.jukeboxFixed = localStorage.getItem('jukeboxFixed') === 'true';

    this.waitressOpacity = 1;
    this.waitressFading = false;

    // One-time post-menu memory about the napkin
    const menuSolved = localStorage.getItem('menuSolved') === 'true';
    const napkinTaken = localStorage.getItem('napkinTaken') === 'true';
    const napkinStoryShown =
      localStorage.getItem('waitressNapkinStoryShown') === 'true';
    if (menuSolved && !napkinTaken && !napkinStoryShown) {
      this.interact.dialogueLine = {
        text:
          'Waitress: “I remembered her order… and the napkin she left.”\n' +
          '“There was writing on it. I almost tossed it, but it felt important.”\n' +
          '“It’s by the register if you want to take it.”'
      };
      this.interact.state = 'dialogue';
      localStorage.setItem('waitressNapkinStoryShown', 'true');
    }

    // 🔔 Listen for jukebox puzzle completion
    window.addEventListener(
      'jukeboxPuzzleComplete',
      this.onJukeboxComplete
    );
  }

  destroy() {
    // safety cleanup
    window.removeEventListener(
      'jukeboxPuzzleComplete',
      this.onJukeboxComplete
    );
  }

  // -------------------------------------------------
  // OBJECT SOURCE (NAPKIN GATED HERE)
  // -------------------------------------------------
  getActiveObjects() {
    // Move menu
    if (
      this.interact.state === 'selectObject' &&
      this.interact.verbs[this.interact.verbIndex] === 'Move'
    ) {
      return this.roomNames.map((name, index) => ({
        name,
        index,
        moveTarget: true
      }));
    }

    const list = [...this.objects[this.roomIndex]];

    // 🧻 Napkin only appears AFTER menu puzzle is solved
    if (
      this.roomIndex === 1 &&
      localStorage.getItem('menuSolved') === 'true' &&
      !localStorage.getItem('napkinTaken')
    ) {
      list.push({
        name: 'Napkin',
        desc: 'A crumpled napkin by the register. Looks like it has something written on it.',
        take: () => this.getNapkinDialogue()
      });
    }

    // 🔌 Fuse object
    if (
      this.roomIndex === 2 &&
      !this.flags.jukeboxFixed &&
      localStorage.getItem('inventory_fuse') === 'true'
    ) {
      list.push({
        name: 'Fuse',
        desc: 'A small electrical fuse.',
        use: () => this.useFuseOnJukebox()
      });
    }

    return list;
  }

  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 400);

    if (this.waitressFading && this.waitressOpacity > 0) {
      this.waitressOpacity -= dt / 1000;
      if (this.waitressOpacity <= 0) {
        this.waitressOpacity = 0;
        this.waitressFading = false;
      }
    }

    if (
      this.interact.state !== 'dialogue' &&
      !this.waitressFading &&
      this.waitressOpacity < 1 &&
      this.flags.waitressSpoken1
    ) {
      this.waitressOpacity += dt / 2000;
      if (this.waitressOpacity > 1) this.waitressOpacity = 1;
    }
  }

  // -------------------------------------------------
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    drawSceneImage(ctx, this.rooms[this.roomIndex].img, ctx.canvas);

    if (this.roomIndex === 1) {
      const targetWidth = W * 0.42;
      const aspect = this.waitressBase.height / this.waitressBase.width;
      const spriteW = targetWidth;
      const spriteH = targetWidth * aspect;
      const x = W * 0.18 - spriteW / 2;
      const y = H - spriteH + (H * 0.06);

      ctx.drawImage(this.waitressBase, x, y, spriteW, spriteH);
      ctx.globalAlpha = this.waitressOpacity;
      ctx.drawImage(this.waitressTop, x, y, spriteW, spriteH);
      ctx.globalAlpha = 1;
    }

    ctx.font = '22px "Pixel-Regular"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.rooms[this.roomIndex].name, W / 2, 40);

    super.render(ctx);
    fadeOverlay(ctx, this.fade);
  }

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
  // OBJECT ACTIONS
  // -------------------------------------------------
  useBooth() {
    if (localStorage.getItem('menuSolved') === 'true') {
      this.interact.dialogueLine = {
        text: 'You already finished your order.'
      };
      this.interact.state = 'dialogue';
      return;
    }

    if (!localStorage.getItem('waitressSpoken1')) {
      this.interact.dialogueLine = {
        text: 'You should probably speak to the waitress first.'
      };
      this.interact.state = 'dialogue';
      return;
    }

    import('./menuScene.js').then(({ MenuScene }) =>
      this.manager.set(new MenuScene(this.manager))
    );
  }

  useJukebox() {
    if (!this.flags.jukeboxFixed) {
      this.interact.dialogueLine = {
        text: 'The jukebox is dead. Something might be wrong with it.'
      };
      this.interact.state = 'dialogue';
      return;
    }

    // ✅ Open overlay directly (NO scene switch)
    this.manager.overlay.show("JukeboxPuzzle");
  }

  onJukeboxComplete(e) {
    // One-shot safety
    window.removeEventListener(
      'jukeboxPuzzleComplete',
      this.onJukeboxComplete
    );

    // Persist completion if you want
    localStorage.setItem('jukeboxPuzzleSolved', 'true');

    // Decide what "done" means
    this.roomIndex = 2; // Dining Section
    this.fade = 1;
    this.interact.state = 'explore';

    // Optional feedback
    this.interact.dialogueLine = {
      text: 'The song lingers in your head long after it ends. Title: "Stars of Orion".'
    };
    this.interact.state = 'dialogue';

    // Notebook entry for the song title
    if (!localStorage.getItem('note_jukeboxSong')) {
      localStorage.setItem('note_jukeboxSong', 'true');
      window.dispatchEvent(new CustomEvent('notesUpdate', {
        detail: {
          title: 'Jukebox Song',
          text: 'Song identified: "Stars of Orion" from the diner jukebox.'
        }
      }));
    }
  }

  getWaitressDialogue() {
    if (!this.flags.waitressSpoken1) {
      this.flags.waitressSpoken1 = true;
      this.flags.waitressSpoken2 = true;
      localStorage.setItem('waitressSpoken1', 'true');
      localStorage.setItem('waitressSpoken2', 'true');
      this.waitressFading = true;
      this.waitressOpacity = 1;
      return '“If you’re ordering, try the corner booth.”';
    }

    return 'She’s already busy taking orders.';
  }

  getNapkinDialogue() {
    if (localStorage.getItem('menuSolved') !== 'true') {
      this.interact.dialogueLine = {
        text: 'You probably shouldn’t touch that yet.'
      };
      this.interact.state = 'dialogue';
      return;
    }

    localStorage.setItem('napkinTaken', 'true');
    localStorage.setItem('inventory_napkin', 'true');
    localStorage.setItem('note_napkinDirections', 'true');

    window.dispatchEvent(
      new CustomEvent('inventoryUpdate', {
        detail: { item: "Sophie’s Napkin" }
      })
    );

    window.dispatchEvent(
      new CustomEvent('notesUpdate', {
        detail: {
          title: 'Napkin Directions',
          text: 'Napkin from Sophie: N, E, S, S, S, W. May match a path downtown.'
        }
      })
    );

    this.interact.dialogueLine = {
      text: 'Faint writing reads: N, E, S, S, S, W.'
    };
    this.interact.state = 'dialogue';
  }

  useFuseOnJukebox() {
    localStorage.removeItem('inventory_fuse');
    localStorage.setItem('jukeboxFixed', 'true');
    this.flags.jukeboxFixed = true;

    window.dispatchEvent(
      new CustomEvent('inventoryUpdate', {
        detail: { remove: 'Fuse' }
      })
    );

    this.interact.dialogueLine = {
      text: 'You slot the fuse into place.\nThe jukebox sparks back to life.'
    };
    this.interact.state = 'dialogue';
  }
}
