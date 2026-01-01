// ---------- starChartPuzzleOverlay.js ----------
// Star Chart Puzzle Overlay (Option A)
// 4 concentric rings, 9 positions each. Code from matchbook: 5-7-3-2
// - Requires: localStorage "starChartEnabled" === "true" to be usable
// - On solve: sets localStorage "starChartSolved" === "true"
// - Calls optional scene hook: manager.scene?.onStarChartPuzzleComplete?.()
//
// Controls:
// - ↑ / ↓ (or W/S): select ring
// - ← / → (or A/D): rotate selected ring
// - ENTER: lock ring if aligned (position matches target)
// - ESC: exit overlay
//
// Optional mouse:
// - Click near a ring to select it
// - Click left/right side to rotate selected ring
//
// ✅ ENGINE ALIGNMENT PATCH:
// - Dispatches global completion event "starChartPuzzleComplete"
//   so scenes can listen (warehouse-style) without tight coupling.

import { getLayout } from "./layout.js";
import { drawBox, drawTextCentered } from "./ui.js";

export class StarChartPuzzleOverlay {
  constructor(manager) {
    this.name = "StarChartPuzzle";
    this.manager = manager;

    // UI
    this.active = false;
    this.activeRing = 0;
    this.message = "";
    this.hint = "Code hint: 5-7-3-2";

    // Puzzle
    // Positions are 1..9 (player-friendly), targets are 5,7,3,2
    this.rings = [
      { label: "Outer Ring",  position: 1, target: 5, locked: false },
      { label: "Ring 2",      position: 1, target: 7, locked: false },
      { label: "Ring 3",      position: 1, target: 3, locked: false },
      { label: "Inner Ring",  position: 1, target: 2, locked: false }
    ];

    // Visual tuning
    this.nodeCount = 9;
    this.spinCooldown = 0; // ms (tiny input smoothing)
    this.flashTimer = 0;   // ms (solve flash)
    this.justSolved = false;

    // Audio
    this.successSound = new Audio("assets/sounds/success.wav");
    this.successSound.volume = 0.8;
    this.successSound.preload = "auto";
  }

  // ------------------------------------------------------------
  // INIT / CLOSE
  // ------------------------------------------------------------
  init() {
    this.active = true;
    this.activeRing = 0;
    this.spinCooldown = 0;
    this.flashTimer = 0;
    this.justSolved = false;

    // If already solved, we can optionally no-op or show "already solved"
    if (localStorage.getItem("starChartSolved") === "true") {
      this.message = "The star chart is already aligned.";
      // Keep it viewable, but it will be locked if you want.
      this.rings.forEach(r => (r.locked = true));
      return;
    }

    // If not enabled, show a message and still allow exit
    const enabled = localStorage.getItem("starChartEnabled") === "true";
    if (!enabled) {
      this.message = "The monitor is dark. The analyzer must be powered first.";
      // Keep puzzle inert: all rings locked so player can't interact
      this.rings.forEach(r => (r.locked = true));
      return;
    }

    // Fresh start (or keep persistent positions if you want later)
    this.rings.forEach(r => {
      r.locked = false;
      r.position = 1;
    });

    this.message = "Align the four rings. Lock each ring when it’s correct.";
  }

  onClose() {
    this.active = false;
  }

  // ------------------------------------------------------------
  // UPDATE (optional)
  // ------------------------------------------------------------
  update(dt) {
    if (!this.active) return;

    if (this.spinCooldown > 0) this.spinCooldown = Math.max(0, this.spinCooldown - dt);

    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      if (this.flashTimer === 0 && this.justSolved) {
        // After the flash, close overlay and inform scene
        this.justSolved = false;

        // ✅ ENGINE-ALIGNED: dispatch global completion event
        // Scenes (like ControlRoomScene) can listen and react consistently.
        window.dispatchEvent(new Event("starChartPuzzleComplete"));

        // Optional: keep the old hook for backward compatibility
        // (Safe; won’t crash if undefined)
        try {
          this.manager.scene?.onStarChartPuzzleComplete?.();
        } catch (err) {
            localStorage.setItem("observatoryStarChartSolved", "true");
          console.warn("StarChartPuzzleOverlay: scene callback error", err);
        }

        // Close overlay
        this.manager.overlay.hide();
      }
    }
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  render(ctx) {
    if (!this.active) return;

    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);

    // Background panel
    drawBox(ctx, x, y, w, h, "rgba(0,0,0,0.86)", "#ffffff");

    drawTextCentered(ctx, "STAR CHART MONITOR", y + 55, "#fff", 34);

    // Status / hint line
    const statusLine =
      localStorage.getItem("starChartSolved") === "true"
        ? "Status: SOLVED"
        : "Status: ACTIVE";

    drawTextCentered(ctx, statusLine, y + 98, "#aaa", 18);
    drawTextCentered(ctx, this.hint, y + 128, "#777", 18);

    // Puzzle area center
    const cx = x + w / 2;
    const cy = y + h / 2 + 30;

    // Ring sizing
    const maxRadius = Math.min(w, h) * 0.30;
    const ringGap = maxRadius / 5; // 4 rings → 5 segments is a nice spacing
    const ringRadii = [
      maxRadius,
      maxRadius - ringGap,
      maxRadius - ringGap * 2,
      maxRadius - ringGap * 3
    ];

    // Solve flash overlay effect (subtle)
    if (this.flashTimer > 0) {
      const alpha = Math.min(1, this.flashTimer / 350);
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }

    // Draw alignment axis (vertical)
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - maxRadius - 25);
    ctx.lineTo(cx, cy + maxRadius + 25);
    ctx.stroke();
    ctx.restore();

    // Draw rings + nodes
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const radius = ringRadii[i];

      // Ring outline
      ctx.save();

      const isActive = (i === this.activeRing);
      const isLocked = ring.locked;
      const aligned = (ring.position === ring.target);

      // Outline styling
      let stroke = "rgba(255,255,255,0.25)";
      let widthLine = 2;

      if (isLocked) {
        stroke = "rgba(0,255,170,0.65)";
        widthLine = 3;
      } else if (isActive) {
        stroke = "rgba(0,204,255,0.60)";
        widthLine = 3;
      }

      ctx.strokeStyle = stroke;
      ctx.lineWidth = widthLine;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw nodes around ring
      for (let p = 1; p <= this.nodeCount; p++) {
        const angle = this.positionToAngle(p, ring.position);
        const nx = cx + Math.cos(angle) * radius;
        const ny = cy + Math.sin(angle) * radius;

        // Node appearance
        let nodeFill = "rgba(255,255,255,0.15)";
        let nodeStroke = "rgba(255,255,255,0.30)";

        // Target node for this ring (in its own ring coordinate)
        // We want the "target position" to land on the axis when ring.position === ring.target.
        // We’ll visually mark the node that corresponds to ring.target in the ring’s internal numbering.
        const isTargetNode = (p === ring.target);

        if (isTargetNode) {
          nodeFill = "rgba(255,255,255,0.22)";
          nodeStroke = "rgba(255,255,255,0.55)";
        }

        if (aligned && !isLocked) {
          // When aligned but not locked yet, make it glow a bit
          nodeStroke = "rgba(0,204,255,0.75)";
        }

        if (isLocked && isTargetNode) {
          nodeStroke = "rgba(0,255,170,0.95)";
          nodeFill = "rgba(0,255,170,0.20)";
        }

        // Node size
        const r = isTargetNode ? 7 : 5;

        ctx.fillStyle = nodeFill;
        ctx.strokeStyle = nodeStroke;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw ring index label near top-left of ring
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = '16px "Pixel-Regular"';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const labelX = cx - radius + 14;
      const labelY = cy - radius + 18;

      const ringLabel = `R${i + 1}: ${ring.position}/${this.nodeCount}${ring.locked ? " (LOCK)" : ""}`;
      ctx.fillText(ringLabel, labelX, labelY);

      ctx.restore();
    }

    // Instruction footer
    drawTextCentered(ctx, this.message, y + h - 120, "#fff", 20);

    const footer =
      "↑↓ Select Ring • ←→ Rotate • ENTER Lock • ESC Exit";
    drawTextCentered(ctx, footer, y + h - 70, "#888", 18);

    // Small help: show what ring expects
    const r = this.rings[this.activeRing];
    const ringHint = `Selected Ring Target: ${r.target}  |  Current: ${r.position}  |  ${r.locked ? "Locked" : "Unlocked"}`;
    drawTextCentered(ctx, ringHint, y + h - 95, "#777", 18);
  }

  // ------------------------------------------------------------
  // INPUT
  // ------------------------------------------------------------
  handleInput(e) {
    if (!this.active) return;

    const key = e.key.toLowerCase();

    // Always allow exit
    if (key === "escape") {
      this.manager.overlay.hide();
      return;
    }

    // If solved or inert, ignore other inputs
    const enabled = localStorage.getItem("starChartEnabled") === "true";
    const solved = localStorage.getItem("starChartSolved") === "true";
    if (!enabled || solved) return;

    // If we're mid-solve flash, ignore input
    if (this.flashTimer > 0) return;

    // Ring selection
    if (key === "arrowup" || key === "w") {
      this.activeRing = (this.activeRing - 1 + this.rings.length) % this.rings.length;
      return;
    }
    if (key === "arrowdown" || key === "s") {
      this.activeRing = (this.activeRing + 1) % this.rings.length;
      return;
    }

    // Rotate ring
    if (key === "arrowleft" || key === "a") {
      this.rotateActive(-1);
      return;
    }
    if (key === "arrowright" || key === "d") {
      this.rotateActive(1);
      return;
    }

    // Lock ring if aligned
    if (key === "enter") {
      this.tryLockActiveRing();
      return;
    }
  }

  // Optional mouse support (OverlayManager already forwards mousedown if handleClick exists)
  handleClick(evt, ctx) {
    if (!this.active) return;

    const enabled = localStorage.getItem("starChartEnabled") === "true";
    const solved = localStorage.getItem("starChartSolved") === "true";
    if (!enabled || solved) return;
    if (this.flashTimer > 0) return;

    const rect = ctx.canvas.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;

    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);
    const cx = x + w / 2;
    const cy = y + h / 2 + 30;

    // Determine which ring by radius distance
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxRadius = Math.min(w, h) * 0.30;
    const ringGap = maxRadius / 5;
    const ringRadii = [
      maxRadius,
      maxRadius - ringGap,
      maxRadius - ringGap * 2,
      maxRadius - ringGap * 3
    ];

    // Click tolerance band
    let chosen = -1;
    for (let i = 0; i < ringRadii.length; i++) {
      const r = ringRadii[i];
      if (Math.abs(dist - r) <= ringGap * 0.45) {
        chosen = i;
        break;
      }
    }

    if (chosen !== -1) {
      this.activeRing = chosen;
    }

    // Click left/right side to rotate
    if (mx < cx - 40) this.rotateActive(-1);
    else if (mx > cx + 40) this.rotateActive(1);
    else this.tryLockActiveRing();
  }

  // ------------------------------------------------------------
  // PUZZLE LOGIC
  // ------------------------------------------------------------
  rotateActive(dir) {
    if (this.spinCooldown > 0) return;

    const ring = this.rings[this.activeRing];
    if (ring.locked) {
      this.message = "That ring is locked.";
      this.spinCooldown = 80;
      return;
    }

    ring.position += dir;

    if (ring.position < 1) ring.position = this.nodeCount;
    if (ring.position > this.nodeCount) ring.position = 1;

    // Subtle guidance in the message area (non-spammy)
    if (ring.position === ring.target) {
      this.message = `Ring ${this.activeRing + 1} aligned. Press ENTER to lock.`;
    } else {
      this.message = "Align the four rings. Lock each ring when it’s correct.";
    }

    this.spinCooldown = 60;
  }

  tryLockActiveRing() {
    const ring = this.rings[this.activeRing];
    if (ring.locked) {
      this.message = "That ring is already locked.";
      return;
    }

    if (ring.position !== ring.target) {
      this.message = `Ring ${this.activeRing + 1} is not aligned.`;
      return;
    }

    ring.locked = true;
    this.message = `Ring ${this.activeRing + 1} locked.`;

    // Auto-advance to next unlocked ring (nice UX)
    const next = this.findNextUnlockedRing();
    if (next !== -1) this.activeRing = next;

    // Check completion
    if (this.rings.every(r => r.locked)) {
      this.finishPuzzle();
    }
  }

  finishPuzzle() {
    localStorage.setItem("starChartSolved", "true");
    this.message = "Alignment confirmed. The monitor hums to life...";

    try {
      this.successSound.currentTime = 0;
      this.successSound.play();
    } catch (err) {
      // ignore audio errors
    }

    // Brief flash, then close + callback in update()
    this.flashTimer = 450;
    this.justSolved = true;
  }

  findNextUnlockedRing() {
    for (let i = 0; i < this.rings.length; i++) {
      const idx = (this.activeRing + 1 + i) % this.rings.length;
      if (!this.rings[idx].locked) return idx;
    }
    return -1;
  }

  // ------------------------------------------------------------
  // Angle math
  // ------------------------------------------------------------
  // We want "aligned" (position === target) to land on the vertical axis (top).
  // We'll treat internal node p (1..9) as fixed positions around the ring.
  // ring.position acts like a rotation offset: higher position rotates nodes clockwise.
  positionToAngle(p, ringRotationPosition) {
    // Base angle for node p: start at top (-90°), go clockwise
    const base = -Math.PI / 2;
    const step = (Math.PI * 2) / this.nodeCount;

    // We rotate the ring by ringRotationPosition so that target aligns at top when equal.
    // If ringRotationPosition increases, the nodes shift clockwise.
    // The node index p appears at angle: base + (p - ringRotationPosition) * step
    // This makes p == ringRotationPosition land at top.
    const angle = base + (p - ringRotationPosition) * step;
    return angle;
  }
}
