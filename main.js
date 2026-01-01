// ---------- main.js ----------
// Core boot logic + overlay-safe input routing
// FIX:
// - Overlay input now has absolute priority
// - Scene input never fires while an overlay is active
// - Prevents verb menus / scenes from eating overlay keys
// - Keybar remains hub-safe

import { SceneManager } from './sceneManager.js';
import { OverlayManager } from './overlayManager.js';
import { loadAssets } from './assets.js';
import { PhaseManager } from "./phaseManager.js";

// Phone overlays (Phase 1–5)
import { PhoneOverlayPhase1 } from "./phoneOverlayphase1.js";
import { PhoneOverlayPhase2 } from "./phoneOverlayphase2.js";
import { PhoneOverlayPhase3 } from "./phoneOverlayphase3.js";
import { PhoneOverlayPhase4 } from "./phoneOverlayphase4.js";
import { PhoneOverlayPhase5 } from "./phoneOverlayphase5.js";

import { NotebookOverlay } from './notebookOverlay.js';
import { LocationOverlay } from './locationOverlay.js';
import { InventoryOverlay } from './inventoryOverlay.js';
import { WarehousePuzzleOverlay } from "./warehousePuzzleOverlay.js";
import { StarChartPuzzleOverlay } from "./starChartPuzzleOverlay.js";
import { JukeboxPuzzleOverlay } from "./jukebox.js";
import { SewerMazeOverlay } from "./sewerMazeOverlay.js";

import { TitleScene } from './titleScene.js';
import { drawKeyBar } from './ui.js';

// ------------------------------------------------
// Canvas Setup
// ------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ------------------------------------------------
// Resize Handling
// ------------------------------------------------
resize();
window.addEventListener('resize', resize);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// ------------------------------------------------
// Boot
// ------------------------------------------------
const manager = new SceneManager(ctx);
manager.assets = new Map();

await loadAssets(manager);
await document.fonts.load('16px "Pixel-Regular"');

// ------------------------------------------------
// Phase Manager (GLOBAL)
// ------------------------------------------------
const phaseManager = new PhaseManager();
window.phaseManager = phaseManager; // debug only

// ------------------------------------------------
// Overlay Manager
// ------------------------------------------------
manager.overlay = new OverlayManager(ctx);

// ------------------------------------------------
// Helpers
// ------------------------------------------------
function getCurrentScene() {
  return manager.scene || null;
}

// Keybar visibility should be a SCENE CHOICE (hub-safe)
function canShowKeyBar() {
  const scene = getCurrentScene();
  return scene?.canShowKeyBar === true;
}

// ------------------------------------------------
// PHONE OVERLAY SELECTION (ONE SLOT)
// ------------------------------------------------
function isPhaseReady(phaseKey) {
  return (
    phaseManager.isReady?.(phaseKey) ||
    localStorage.getItem(`${phaseKey}_ready`) === "true"
  );
}

function isPhaseCompleted(phaseKey) {
  return (
    phaseManager.isCompleted?.(phaseKey) ||
    localStorage.getItem(`${phaseKey}_completed`) === "true"
  );
}

function isPhase1Completed() {
  if (isPhaseCompleted("phase1")) return true;
  if (localStorage.getItem("gordonFirstDone") === "true") return true;
  return false;
}

function createPhoneOverlay() {
  // ------------------------------------------------
  // PHASE 5 — FINAL TRUST COLLAPSE
  // ------------------------------------------------
  if (isPhaseReady("phase5") && !isPhaseCompleted("phase5")) {
    return new PhoneOverlayPhase5(manager);
  }

  // ------------------------------------------------
  // PHASE 4
  // ------------------------------------------------
  if (isPhaseReady("phase4") && !isPhaseCompleted("phase4")) {
    return new PhoneOverlayPhase4(manager);
  }

  // ------------------------------------------------
  // PHASE 3
  // ------------------------------------------------
  if (isPhaseReady("phase3") && !isPhaseCompleted("phase3")) {
    return new PhoneOverlayPhase3(manager);
  }

  // ------------------------------------------------
  // PHASE 1 / 2
  // ------------------------------------------------
  if (!isPhase1Completed()) {
    return new PhoneOverlayPhase1(manager);
  }

  return new PhoneOverlayPhase2(manager);
}

function mountPhoneOverlay() {
  const wasOpen = manager.overlay.active?.name === "Phone";
  manager.overlay.add("Phone", createPhoneOverlay());
  if (wasOpen) manager.overlay.show("Phone");
}

// ------------------------------------------------
// Mount overlays
// ------------------------------------------------
mountPhoneOverlay();

manager.overlay.add("Notebook", new NotebookOverlay(manager));
manager.overlay.add("Location", new LocationOverlay(manager));
manager.overlay.add("Inventory", new InventoryOverlay(manager));
manager.overlay.add("WarehousePuzzle", new WarehousePuzzleOverlay(manager));
manager.overlay.add("StarChartPuzzle", new StarChartPuzzleOverlay(manager));
manager.overlay.add("JukeboxPuzzle", new JukeboxPuzzleOverlay(manager));
manager.overlay.add("SewerMaze", new SewerMazeOverlay(manager));

// Refresh phone overlay when phases change
window.addEventListener("phoneUpdate", mountPhoneOverlay);

// ------------------------------------------------
// Initial Scene
// ------------------------------------------------
manager.set(new TitleScene(manager));

// ------------------------------------------------
// INPUT (SINGLE SOURCE OF TRUTH — FIXED)
// ------------------------------------------------
window.addEventListener(
  'keydown',
  (e) => {
    // 🔒 OVERLAY INPUT HAS ABSOLUTE PRIORITY
    if (manager.overlay.active) {
      manager.overlay.handleInput(e);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Otherwise, pass input to scene manager
    const handled = manager.handleInput(e);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  { capture: true }
);

// ------------------------------------------------
// Overlay Mouse Support
// ------------------------------------------------
canvas.addEventListener("mousedown", (e) => {
  if (manager.overlay.active?.handleClick) {
    manager.overlay.active.handleClick(e, ctx);
  }
});

// ------------------------------------------------
// Main Loop
// ------------------------------------------------
let last = performance.now();

function loop(now) {
  const dt = now - last;
  last = now;

  manager.update(dt);
  manager.render();

  // ------------------------------------------------
  // UI CHROME (KEYBAR) — DRAW LAST
  // ------------------------------------------------
  if (canShowKeyBar() && !manager.overlay.active) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    drawKeyBar(ctx);
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
