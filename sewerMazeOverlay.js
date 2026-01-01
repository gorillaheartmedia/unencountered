// ---------- sewerMazeOverlay.js ----------
// Final Sewer Maze — 3-stage Fog-of-War Maze Puzzle
// Point of no return
//
// Controls:
// ↑ ↓ ← → move
// ENTER  interact / confirm
// ESC    disabled
//
// On final completion:
// - sets localStorage "finalMazeSolved" = true
// - calls manager.scene?.onFinalMazeComplete?.()

import { getLayout } from "./layout.js";
import { drawBox, drawTextCentered } from "./ui.js";

export class SewerMazeOverlay {
  constructor(manager) {
    this.name = "SewerMaze";
    this.manager = manager;

    this.active = false;

    // -------------------------------------------------
    // Puzzle progression
    // -------------------------------------------------
    this.stage = 0;

    // 0 = floor, 1 = wall
    this.stages = [
      {
        size: 5,
        exit: { r: 4, c: 2 },
        layout: [
          [0,0,1,0,0],
          [0,0,1,0,1],
          [1,0,0,0,1],
          [1,1,1,0,0],
          [0,0,0,0,0]
        ]
      },
      {
        size: 7,
        exit: { r: 6, c: 5 },
        layout: [
          [0,1,0,0,0,1,0],
          [0,1,0,1,0,1,0],
          [0,0,0,1,0,0,0],
          [1,1,0,1,1,1,0],
          [0,0,0,0,0,1,0],
          [0,1,1,1,0,1,0],
          [0,0,0,1,0,0,0]
        ]
      },
      {
        size: 9,
        exit: { r: 8, c: 4 },
        layout: [
          [0,1,0,0,0,1,0,0,0],
          [0,1,0,1,0,1,0,1,0],
          [0,0,0,1,0,0,0,1,0],
          [1,1,0,1,1,1,0,1,0],
          [0,0,0,0,0,0,0,1,0],
          [0,1,1,1,1,1,0,1,0],
          [0,0,0,0,0,0,0,0,0],
          [0,1,1,1,1,1,1,1,0],
          [0,0,0,0,0,0,0,0,0]
        ]
      }
    ];

    this.grid = [];
    this.fog = [];
    this.player = { r: 0, c: 0 };

    this.message = "";
    this.transitionTimer = 0;
    this.justFinished = false;
  }

  // -------------------------------------------------
  init() {
    this.active = true;
    this.stage = 0;
    this.startStage();
  }

  onClose() {
    this.active = false;
  }

  // -------------------------------------------------
  startStage() {
    const stage = this.stages[this.stage];

    this.grid = stage.layout.map(row => [...row]);

    this.fog = Array.from({ length: stage.size }, () =>
      Array.from({ length: stage.size }, () => true)
    );

    this.player = { r: 0, c: 0 };
    this.reveal();

    this.message =
      this.stage === 0
        ? "The sewer branches ahead."
        : this.stage === 1
          ? "The tunnels no longer feel consistent."
          : "You are certain that you've seen this place before.";

    this.transitionTimer = 0;
  }

  // -------------------------------------------------
  update(dt) {
    if (!this.active) return;

    if (this.transitionTimer > 0) {
      this.transitionTimer -= dt;

      if (this.transitionTimer <= 0 && this.justFinished) {
        this.justFinished = false;

        if (this.stage < this.stages.length - 1) {
          this.stage++;
          this.startStage();
        } else {
          this.finishAll();
        }
      }
    }
  }

  // -------------------------------------------------
  reveal() {
    const dirs = [
      [0,0], [-1,0], [1,0], [0,-1], [0,1]
    ];

    for (const [dr, dc] of dirs) {
      const rr = this.player.r + dr;
      const cc = this.player.c + dc;

      if (this.fog[rr]?.[cc] !== undefined) {
        this.fog[rr][cc] = false;
      }
    }
  }

  // -------------------------------------------------
  render(ctx) {
    if (!this.active) return;

    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);
    drawBox(ctx, x, y, w, h, "rgba(0,0,0,0.92)", "#fff");

    drawTextCentered(
      ctx,
      `SEWER MAZE — STAGE ${this.stage + 1}`,
      y + 60,
      "#fff",
      32
    );

    const size = this.grid.length;
    const cell = Math.min(w, h) * 0.55 / size;
    const gx = x + w / 2 - (cell * size) / 2;
    const gy = y + h / 2 - (cell * size) / 2 + 20;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const px = gx + c * cell;
        const py = gy + r * cell;

        if (this.fog[r][c]) {
          ctx.fillStyle = "#000";
          ctx.fillRect(px, py, cell, cell);
          continue;
        }

        if (this.grid[r][c] === 1) {
          ctx.fillStyle = "rgba(80,80,80,0.9)";
          ctx.fillRect(px, py, cell, cell);
          continue;
        }

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(px, py, cell, cell);

        const exit = this.stages[this.stage].exit;
        if (r === exit.r && c === exit.c) {
          ctx.strokeStyle = "rgba(0,255,170,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
        }

        if (r === this.player.r && c === this.player.c) {
          ctx.fillStyle = "#ffff66";
          ctx.fillRect(px + 6, py + 6, cell - 12, cell - 12);
        }
      }
    }

    drawTextCentered(ctx, this.message, y + h - 110, "#aaa", 20);
    drawTextCentered(
      ctx,
      "↑ ↓ ← → Move",
      y + h - 70,
      "#666",
      18
    );
  }

  // -------------------------------------------------
  handleInput(e) {
    if (!this.active || this.transitionTimer > 0) return;

    const key = e.key.toLowerCase();
    let nr = this.player.r;
    let nc = this.player.c;

    if (key === "arrowup") nr--;
    if (key === "arrowdown") nr++;
    if (key === "arrowleft") nc--;
    if (key === "arrowright") nc++;

    if (
      this.grid[nr]?.[nc] === 0
    ) {
      this.player.r = nr;
      this.player.c = nc;
      this.reveal();

      const exit = this.stages[this.stage].exit;
      if (nr === exit.r && nc === exit.c) {
        this.message = "You found a way forward.";
        this.transitionTimer = 700;
        this.justFinished = true;
      }
    }
  }

  // -------------------------------------------------
  finishAll() {
    localStorage.setItem("finalMazeSolved", "true");

    this.message = "There is no turning back now.";

    try {
      this.manager.scene?.onFinalMazeComplete?.();
    } catch (e) {
      console.warn("Final maze callback error", e);
    }

    this.manager.overlay.hide();
  }
}
