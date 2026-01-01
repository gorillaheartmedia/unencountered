// ---------- warehouseFloor.js ----------
// Fullscreen warehouse floor background (for the crate puzzle)

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { WarehouseOfficeScene } from "./warehouseOffice.js";

export class WarehouseFloorScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.bg = new Image();
    this.bg.src = "assets/warehouse.png";

    // bind once so we can remove it later
    this.onPuzzleComplete = this.onPuzzleComplete.bind(this);
  }

  init() {
    this.fade = 1;
    window.addEventListener("warehousePuzzleComplete", this.onPuzzleComplete);
  }

  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  render(ctx) {
    drawSceneImage(ctx, this.bg, ctx.canvas);
    fadeOverlay(ctx, this.fade);
  }

  handleInput(e) {
    // Puzzle overlay handles all input
  }

  onPuzzleComplete() {
    window.removeEventListener("warehousePuzzleComplete", this.onPuzzleComplete);
    this.manager.set(new WarehouseOfficeScene(this.manager));
  }

  destroy() {
    // safety cleanup if scene is ever replaced early
    window.removeEventListener("warehousePuzzleComplete", this.onPuzzleComplete);
  }
}
