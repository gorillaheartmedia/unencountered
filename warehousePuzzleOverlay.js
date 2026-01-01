// ------------------------------------------------------
//  WarehousePuzzleOverlay.js (EVENT-BASED FINAL VERSION)
// ------------------------------------------------------

import { getLayout } from "./layout.js";
import { drawBox, drawTextCentered } from "./ui.js";

const WORD_LIST = [
  "ROUTE","BOXES","TRUCK","CARGO","DOCKS","LOADS","ORDER","LABEL","DRIVE",
  "CRATE","STOCK","ITEMS","GOODS","PARTS","CASES","PACKS","SACKS","POUCH",
  "STACK","STOWS","SHELF","STORE","COUNT","AUDIT","BUILD","PRINT","SCALE",
  "ALIGN","FORMS","LISTS","CODES","NOTES","DOORS","AISLE","FLOOR",
  "CARTS","HOIST","SLING","LOCKS","GUARD","DATES"
];

export class WarehousePuzzleOverlay {
  constructor(manager) {
    this.name = "WarehousePuzzle";
    this.manager = manager;

    this.grid = [];
    this.solutionWord = "";
    this.solutionPos = [];
    this.selectedRows = ["","","","",""];
    this.attempts = 3;

    this.completedPuzzles = 0;
    this.maxPuzzles = 3;

    this.message = "";
    this.active = false;

    this.selectorRow = 0;
    this.selectorCol = 0;
  }

  init() {
    this.active = true;
    this.completedPuzzles = 0;
    this.message = "Help Dave load the trucks. Pick 5 letters — one per column.";
    this.startNewPuzzle();
  }

  emptyGrid() {
    return Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => "")
    );
  }

  placeWord(board) {
    this.solutionWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    this.solutionPos = [];

    for (let col = 0; col < 5; col++) {
      const row = Math.floor(Math.random() * 5);
      board[row][col] = this.solutionWord[col];
      this.solutionPos[col] = row;
    }
  }

  fillRandom(board) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (!board[y][x]) {
          board[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }
  }

  startNewPuzzle() {
    this.grid = this.emptyGrid();
    this.placeWord(this.grid);
    this.fillRandom(this.grid);

    this.selectedRows = ["","","","",""];
    this.attempts = 3;
    this.selectorRow = 0;
    this.selectorCol = 0;
    this.message = "Select one letter from each column.";
  }

  render(ctx) {
    if (!this.active) return;

    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);
    drawBox(ctx, x, y, w, h, "rgba(0,0,0,0.82)", "#fff");

    drawTextCentered(ctx, "WAREHOUSE SHIPMENT PUZZLE", y + 50, "#fff", 36);
    drawTextCentered(ctx, `Puzzle ${this.completedPuzzles + 1} of ${this.maxPuzzles}`, y + 100, "#fff", 22);
    drawTextCentered(ctx, `Attempts Left: ${this.attempts}`, y + 150, "#ffdd55", 22);

    const gridSize = 70;
    const gridGap = 14;
    const gridWidth = 5 * gridSize + 4 * gridGap;
    const startX = x + (w - gridWidth) / 2;
    const startY = y + 200;

    ctx.font = '32px "Pixel-Regular"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cx = startX + col * (gridSize + gridGap);
        const cy = startY + row * (gridSize + gridGap);

        let fill = "rgba(255,255,255,0.05)";
        let stroke = "#777";

        if (this.selectedRows[col] === row) {
          fill = "rgba(0,150,80,0.6)";
          stroke = "#00ff99";
        }

        drawBox(ctx, cx, cy, gridSize, gridSize, fill, stroke);
        ctx.fillStyle = "#fff";
        ctx.fillText(this.grid[row][col], cx + gridSize / 2, cy + gridSize / 2 + 2);

        if (this.selectorRow === row && this.selectorCol === col) {
          ctx.strokeStyle = "#00ccff";
          ctx.lineWidth = 3;
          ctx.strokeRect(cx - 2, cy - 2, gridSize + 4, gridSize + 4);
        }
      }
    }

    drawTextCentered(ctx, this.message, y + h - 140, "#fff", 22);
    drawTextCentered(ctx, "ARROWS + ENTER • ESC to exit", y + h - 80, "#888", 20);
  }

  checkIfComplete() {
    if (!this.selectedRows.every(r => r !== "")) return;

    const word = this.selectedRows.map((r, c) => this.grid[r][c]).join("");

    if (word === this.solutionWord) {
      this.completedPuzzles++;
      if (this.completedPuzzles >= this.maxPuzzles) {
        this.finishAllPuzzles();
      } else {
        this.message = `Correct: ${word}!`;
        setTimeout(() => this.startNewPuzzle(), 1200);
      }
      return;
    }

    this.attempts--;
    if (this.attempts <= 0) {
      this.message = `Out of attempts! The word was ${this.solutionWord}.`;
      setTimeout(() => this.startNewPuzzle(), 1300);
    } else {
      this.message = `Incorrect! Attempts left: ${this.attempts}`;
      this.selectedRows = ["","","","",""];
    }
  }

  finishAllPuzzles() {
    this.message = "Shipments sorted!";

    localStorage.setItem("warehousePuzzleDone", "true");

    setTimeout(() => {
      this.active = false;
      this.manager.overlay.hide();

      // ✅ EVENT-BASED HANDOFF
      window.dispatchEvent(new Event("warehousePuzzleComplete"));
    }, 1500);
  }

  handleInput(e) {
    const key = e.key.toLowerCase();

    if (key === "arrowup" || key === "w") this.selectorRow = (this.selectorRow + 4) % 5;
    if (key === "arrowdown" || key === "s") this.selectorRow = (this.selectorRow + 1) % 5;
    if (key === "arrowleft" || key === "a") this.selectorCol = (this.selectorCol + 4) % 5;
    if (key === "arrowright" || key === "d") this.selectorCol = (this.selectorCol + 1) % 5;

    if (key === "enter") {
      this.selectedRows[this.selectorCol] = this.selectorRow;
      this.checkIfComplete();
    }

    if (key === "escape") {
      this.manager.overlay.hide();
    }
  }
}
