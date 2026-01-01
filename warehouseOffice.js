// ---------- warehouseOffice.js ----------
// Dave’s warehouse office scene
// - FULL interactive scene (verbs enabled)
// - NO Move verb
// - Dialogue queue preserved
// - Phase 3 trigger stays HERE (correct narrative location)

import { BaseInteractiveScene } from "./BaseInteractiveScene.js";
import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { OfficeScene } from "./office.js";
import { PhaseManager } from "./phaseManager.js";


export class WarehouseOfficeScene extends BaseInteractiveScene {
  constructor(manager) {
    super(manager);


    this.phaseManager = new PhaseManager();

    // -------------------------------------------------
    // Scene identity
    // -------------------------------------------------
    this.sceneType = "interactive";
    this.canMove = false;

    // -------------------------------------------------
    // State
    // -------------------------------------------------
    this.fade = 1;
    this.spokeToDave = false;

    // -------------------------------------------------
    // Background
    // -------------------------------------------------
    this.bg = new Image();
    this.bg.src = "assets/warehouse_office.png";

    // -------------------------------------------------
    // Dave portrait
    // -------------------------------------------------
    this.dave = new Image();
    this.dave.src = "assets/dave.png";

    // -------------------------------------------------
    // Keycard reveal
    // -------------------------------------------------
    this.keycard = new Image();
    this.keycard.src = "assets/keycard.png";
    this.showCard = false;

    // -------------------------------------------------
    // Dialogue queue engine
    // -------------------------------------------------
    this.dialogueQueue = null;
    this.dialogueCallback = null;

    // -------------------------------------------------
    // Objects
    // -------------------------------------------------
    this.objects = [
      {
        name: "Dave",
        desc: "He’s hunched over manifests, muttering about shipments.",
        speak: () => this.handleDaveTalk()
      },
      {
        name: "Desk",
        desc: "Stacks of paperwork, worn labels, and a cold cup of coffee."
      },
      {
        name: "Clipboard",
        desc: "Full of delivery logs and truck routing notes."
      },
      {
        name: "Door",
        desc: "Leads out to the warehouse loading floor.",
        use: () => this.useDoor()
      }
    ];
  }

  // -------------------------------------------------
  init() {
    this.fade = 1;
  }

  // -------------------------------------------------
  getActiveObjects() {
    return this.objects;
  }

  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  // -------------------------------------------------
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    drawSceneImage(ctx, this.bg, ctx.canvas);

    // Dave portrait
    if (this.dave.complete && this.dave.naturalWidth > 0) {
      const spriteH = H * 0.75;
      const spriteW = this.dave.width * (spriteH / this.dave.height);
      const x = W * 0.09;
      const y = H - spriteH - 20; // lower the sprite on screen

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.dave, x, y, spriteW, spriteH);
    }

    // Keycard overlay
    if (this.showCard && this.keycard.complete) {
      const cardW = W * 0.35;
      const cardH = this.keycard.height * (cardW / this.keycard.width);
      const cx = (W - cardW) / 2;
      const cy = (H - cardH) / 2;
      ctx.drawImage(this.keycard, cx, cy, cardW, cardH);
    }

    // 🔑 VERB SYSTEM
    super.render(ctx);

    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------
  handleInput(e) {
    if (super.handleInput(e)) return true;

    if (e.key.toLowerCase() === "escape") {
      this.manager.set(new OfficeScene(this.manager));
      return true;
    }

    return false;
  }

  // =================================================
  // DIALOGUE QUEUE ENGINE (UNCHANGED BEHAVIOR)
  // =================================================
  queueDialogue(lines, callback) {
    this.dialogueQueue = lines.slice();
    this.dialogueCallback = callback || null;

    const originalHandler = this.interact.handleInput.bind(this.interact);

    const first = this.dialogueQueue.shift();
    if (first === "::SHOW_KEYCARD::") {
      this.showCard = true;
      this.interact.dialogueLine = null;
    } else {
      this.interact.dialogueLine = { text: first };
    }

    this.interact.state = "dialogue";

    this.interact.handleInput = (e, objects) => {
      const key = e.key.toLowerCase();

      if (key === "enter" && this.interact.state === "dialogue") {

        if (this.showCard) {
          this.showCard = false;
        }

        if (this.dialogueQueue.length > 0) {
          const next = this.dialogueQueue.shift();
          if (next === "::SHOW_KEYCARD::") {
            this.showCard = true;
            this.interact.dialogueLine = null;
          } else {
            this.interact.dialogueLine = { text: next };
          }
          return true;
        }

        this.finishDialogue(originalHandler);
        return true;
      }

      return originalHandler(e, objects);
    };
  }

  finishDialogue(originalHandler) {
    this.interact.dialogueLine = null;
    this.interact.state = "explore";
    this.interact.handleInput = originalHandler;

    if (this.dialogueCallback) this.dialogueCallback();
  }

  // =================================================
  // DAVE LOGIC (PHASE 3 TRIGGER — CORRECT LOCATION)
  // =================================================
  handleDaveTalk() {
    const puzzleDone = localStorage.getItem("warehousePuzzleDone") === "true";
    const hasPackage = localStorage.getItem("inventory_observatoryPackage") === "true";

    if (!puzzleDone) {
      this.spokeToDave = true;
      return "Dave says: “Good timing. I could really use help sorting shipments out back.”";
    }

    if (puzzleDone && !hasPackage) {
      this.queueDialogue(
        [
          "Nice work out there — you handled that board better than most of my crew.",
          "Alright, let me see that keycard you found downtown.",
          "::SHOW_KEYCARD::",
          "Interesting. Well.. not one I ever seen before.",
          "Wrong coding pattern. Wrong strip color.",
          "This is access-grade hardware. Restricted... Classified...",
          "There's no other identifers on it. No company name, no ID number, nothing...",
          "It might be best to hold on to it for now.",
          "You may even find who it belongs to.. Who knows, right?",
          "Anyways, I need a favor.",
          "The Observatory placed an urgent request.",
          "Can you deliver a sealed package for me?"
        ],
        () => {
          localStorage.setItem("inventory_observatoryPackage", "true");
          localStorage.setItem("observatoryVisitEnabled", "true");
          // Phase transition
this.phaseManager.completePhase("phase2");
localStorage.setItem("phase3_ready", "true");

// 🔥 Force Phone overlay rebuild NOW (no reload needed)
window.dispatchEvent(new Event("phoneUpdate"));


          window.dispatchEvent(
            new CustomEvent("inventoryUpdate", {
              detail: { item: "Observatory Package" }
            })
          );
        }
      );
      return "";
    }

    return "Dave says: “Take that package up to the Observatory when you get a chance.”";
  }
  

  // =================================================
  // DOOR LOGIC
  // =================================================
  useDoor() {
    const puzzleDone = localStorage.getItem("warehousePuzzleDone") === "true";

    if (!this.spokeToDave && !puzzleDone) {
      this.interact.dialogueLine = {
        text: "You should talk to Dave before heading into the warehouse."
      };
      this.interact.state = "dialogue";
      return;
    }

    if (puzzleDone) {
      this.interact.dialogueLine = {
        text: "The warehouse floor is quiet. Your work here is done."
      };
      this.interact.state = "dialogue";
      return;
    }

    import("./warehouseFloor.js").then(({ WarehouseFloorScene }) => {
      this.manager.set(new WarehouseFloorScene(this.manager));
      setTimeout(() => {
        this.manager.overlay.toggle("WarehousePuzzle");
      }, 75);
    });
  }
}
