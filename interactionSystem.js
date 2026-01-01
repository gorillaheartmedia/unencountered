// ---------- interactionSystem.js ----------
// Universal verb–noun interface for interactive scenes
// ARCHITECTURE UPDATE:
// - Scenes declare scene.sceneType = "interactive" | "cinematic"
// - Interactive scenes auto-recover from idle after dialogue
// - Cinematic scenes remain idle permanently
// - No per-scene verb restoration needed

import { drawBox, drawTextCentered } from './ui.js';

export class InteractionSystem {
  constructor(scene) {
    this.scene = scene;

    // STATES:
    // idle         → no UI, no verbs
    // explore      → verb bar visible
    // selectObject → choosing an object
    // dialogue     → showing dialogue
    this.state = 'idle';

    this.verbs = ['Look', 'Speak', 'Use', 'Take', 'Move'];

    this.verbIndex = 0;
    this.objectIndex = 0;

    this.dialogueLine = null;
  }

  // ---------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------
  _safeObjects(objects) {
    return Array.isArray(objects) ? objects : [];
  }

  _overlayOpen() {
    const mgr = this.scene?.manager;
    return !!mgr?.overlay?.active;
  }

  // ---------------------------------------------------------
  // PUBLIC CONTROL API
  // ---------------------------------------------------------
  enableExploreMode() {
    this.state = 'explore';
    this.verbIndex = this.findNextVisibleVerb(0);
    this.objectIndex = 0;
  }

  disable() {
    this._forceIdle();
  }

  _forceIdle() {
    if (this.state !== 'idle') {
      this.state = 'idle';
      this.dialogueLine = null;

      // Helpful debug signal (non-fatal)
      console.warn(
        'InteractionSystem forced to idle:',
        this.scene?.constructor?.name
      );
    }
  }

  // ---------------------------------------------------------
  // AUTO-RECOVERY (CORE FIX)
  // ---------------------------------------------------------
  _autoRecoverIfAllowed() {
    if (
      this.scene?.sceneType === 'interactive' &&
      this.state === 'idle' &&
      !this._overlayOpen()
    ) {
      this.enableExploreMode();
    }
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  render(ctx, objects) {
    if (this._overlayOpen()) return;

    // 🔁 Self-heal before rendering
    this._autoRecoverIfAllowed();

    if (this.state === 'idle') return;

    const objs = this._safeObjects(objects);
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.imageSmoothingEnabled = false;

    if (this.state === 'explore') {
      this.drawVerbBar(ctx, W, H);
      drawTextCentered(
        ctx,
        '← → Move • ↑↓ Verb • ENTER Select • ESC Exit',
        H - 20,
        '#aaa',
        18
      );
    }

    if (this.state === 'selectObject') {
      this.renderObjectSelect(ctx, objs);
    }

    if (this.state === 'dialogue') {
      this.renderDialogue(ctx, this.dialogueLine);
    }
  }

  // ---------------------------------------------------------
  // VERB BAR
  // ---------------------------------------------------------
  drawVerbBar(ctx, W, H) {
    const verbY = H - 80;

    const visibleVerbs = this.verbs.filter(v => {
      if (v === 'Move' && !this.scene?.canMove) return false;
      return true;
    });

    if (!visibleVerbs.length) return;

    const spacing = W / visibleVerbs.length;

    visibleVerbs.forEach((v, i) => {
      const x = i * spacing + spacing / 2;
      const globalIndex = this.verbs.indexOf(v);

      if (globalIndex === this.verbIndex) {
        drawBox(
          ctx,
          x - 100,
          verbY - 40,
          200,
          50,
          'rgba(0,0,0,0.85)',
          '#fff'
        );
      }

      ctx.fillStyle = '#fff';
      ctx.font = '24px "Pixel-Regular", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(v, x, verbY - 10);
    });
  }

  // ---------------------------------------------------------
  // OBJECT SELECTION
  // ---------------------------------------------------------
  renderObjectSelect(ctx, objects) {
    if (!objects || !objects.length) {
      this.state = 'explore';
      return;
    }

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const rowHeight = 50;
    const boxHeight = 140 + objects.length * rowHeight;
    const boxWidth = 520;

    const boxX = W / 2 - boxWidth / 2;
    const boxY = H / 2 - boxHeight / 2;

    drawBox(ctx, boxX, boxY, boxWidth, boxHeight, 'rgba(0,0,0,0.75)', '#fff');

    ctx.font = '24px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    const verb = this.verbs[this.verbIndex];
    ctx.fillText(
      `What do you want to ${verb.toLowerCase()}?`,
      W / 2,
      boxY + 30
    );

    this.objectIndex = (this.objectIndex + objects.length) % objects.length;

    objects.forEach((o, i) => {
      const y = boxY + 80 + i * rowHeight;

      if (i === this.objectIndex) {
        drawBox(
          ctx,
          W / 2 - 180,
          y - 20,
          360,
          40,
          'rgba(255,255,255,0.15)',
          '#fff'
        );
      }

      ctx.fillText(o?.name ?? `Object ${i + 1}`, W / 2, y + 10);
    });

    drawTextCentered(
      ctx,
      '↑↓ Navigate • ENTER Confirm • ESC Cancel',
      H - 40,
      '#aaa',
      18
    );
  }

  // ---------------------------------------------------------
  // DIALOGUE
  // ---------------------------------------------------------
  renderDialogue(ctx, line) {
    if (!line) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    drawBox(
      ctx,
      W / 2 - 320,
      H - 210,
      640,
      140,
      'rgba(0,0,0,0.75)',
      '#fff'
    );

    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    const lines = this.wrapText(ctx, line.text, 560);
    let y = H - 170;

    lines.forEach(l => {
      ctx.fillText(l, W / 2, y);
      y += 28;
    });

    drawTextCentered(
      ctx,
      'Press ENTER or ESC to continue',
      H - 40,
      '#aaa',
      18
    );
  }

  // ---------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------
  handleInput(e, objects) {
    const key = (e.key || '').toLowerCase();

    if (this._overlayOpen()) return true;

    const objs = this._safeObjects(objects);

    // 🔁 Self-heal before handling input
    this._autoRecoverIfAllowed();

    if (this.state === 'idle') return false;

    if (key === 'escape') {
      if (this.state === 'selectObject' || this.state === 'dialogue') {
        this.state = 'explore';
        return true;
      }
      return false;
    }

    if (this.state === 'dialogue' && key === 'enter') {
      this.state = 'explore';
      return true;
    }

    if (this.state === 'selectObject') {
      if (!objs.length) {
        this.state = 'explore';
        return true;
      }

      if (key === 'arrowdown' || key === 's') {
        this.objectIndex = (this.objectIndex + 1) % objs.length;
        return true;
      }

      if (key === 'arrowup' || key === 'w') {
        this.objectIndex = (this.objectIndex - 1 + objs.length) % objs.length;
        return true;
      }

      if (key === 'enter') {
        this.triggerAction(this.verbs[this.verbIndex], objs[this.objectIndex]);
        return true;
      }

      return true;
    }

    if (this.state === 'explore') {
      if (key === 'arrowup' || key === 'w') {
        this.verbIndex = this.findNextVisibleVerb(-1);
        return true;
      }

      if (key === 'arrowdown' || key === 's') {
        this.verbIndex = this.findNextVisibleVerb(1);
        return true;
      }

      if (key === 'enter') {
        this.state = 'selectObject';
        this.objectIndex = 0;
        return true;
      }
    }

    return false;
  }

  // ---------------------------------------------------------
  // ACTION HANDLER
  // ---------------------------------------------------------
  triggerAction(verb, obj) {
    if (!obj) return;

    let text = '';

    if (verb === 'Look') {
      if (typeof obj.look === 'function') {
        const res = obj.look();
        if (typeof res === 'string') {
          this.dialogueLine = { text: res };
          this.state = 'dialogue';
        }
        return;
      }
      text = obj.desc || `You look at the ${obj.name?.toLowerCase()}.`;
    }

    else if (verb === 'Speak') {
      text = typeof obj.speak === 'function'
        ? obj.speak()
        : obj.speak || `You try speaking to the ${obj.name}.`;
    }

    else if (verb === 'Use') {
      if (typeof obj.use === 'function') {
        obj.use();
        return;
      }
      text = obj.use || `You can't use that.`;
    }

    else if (verb === 'Take') {
      if (typeof obj.take === 'function') {
        obj.take();
        return;
      }
      text = obj.takeText || `You can't take that.`;
    }

    else if (verb === 'Move') {
      return;
    }

    this.dialogueLine = { text };
    this.state = 'dialogue';
  }

  // ---------------------------------------------------------
  // VERB VISIBILITY
  // ---------------------------------------------------------
  findNextVisibleVerb(direction) {
    let i = this.verbIndex;

    while (true) {
      if (direction !== 0) {
        i = (i + direction + this.verbs.length) % this.verbs.length;
      }

      const v = this.verbs[i];
      if (v === 'Move' && !this.scene?.canMove) {
        direction = direction || 1;
        continue;
      }

      return i;
    }
  }

  // ---------------------------------------------------------
  // WORD WRAP
  // ---------------------------------------------------------
  wrapText(ctx, text, maxWidth) {
    if (!text) return [];

    const words = String(text).split(' ');
    const lines = [];
    let current = '';

    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
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
