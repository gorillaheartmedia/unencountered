// ---------- crashSiteScene.js ----------
// Crash / Impact Site memory scene (Round 3) with dual-mode Move support

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";
import { CampsiteMemoryGridScene } from "./CampsiteMemoryGridScene.js";
import { CampsiteScene } from "./campsiteScene.js";
import { CliffScene } from "./cliffScene.js";

export class CrashSiteScene {
  constructor(manager, { memoryMode = true } = {}) {
    this.manager = manager;
    this.fade = 1;

    // Determines MOVE behavior
    this.memoryMode = memoryMode;
    this.canMove = true;

    this.canShowKeyBar = false;

    // Backgrounds
    this.bgDefault = new Image();
    this.bgDefault.src = "assets/memory_crash.png";

    this.bgTrench = new Image();
    this.bgTrench.src = "assets/trench.png";

    this.bgTrenchAfter = new Image();
    this.bgTrenchAfter.src = "assets/trench1.png";

    this.currentBG = this.bgDefault;

    // Sparkle animation frames for crystal
    this.sparkleFrames = [];
    this.sparkleFrameIndex = 0;
    this.sparkleFrameTimer = 0;

    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      img.src = `assets/sparkle${i}.png`;
      this.sparkleFrames.push(img);
    }

    this.interact = new InteractionSystem(this);

    this.inTrench = false;

    this.hasCrystal =
      localStorage.getItem("inventory_crystal") === "true";

    this.justArrived = true;

    // MOVE override list
    this.currentObjectList = null;

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  init() {
    this.fade = 1;
    this.interact.state = "explore";
    this.interact.dialogueLine = null;

    if (this.hasCrystal) {
      this.currentBG = this.bgDefault;
    }
  }

  // -------------------------------------------------------------
  // MOVE OPTIONS
  // -------------------------------------------------------------
  openMoveSelector() {
    const puzzleDone =
      localStorage.getItem("memoryPuzzleComplete") === "true";

    if (!puzzleDone) {
      // Pre-complete: only Trail (back to puzzle)
      this.currentObjectList = [{ name: "Trail", index: "trail" }];
    } else {
      // Post-complete: full network
      this.currentObjectList = [
        { name: "Campsite", index: "camp" },
        { name: "Overlook", index: "cliff" },
        { name: "Trench", index: "crash" }
      ];
    }

    this.interact.state = "selectObject";
    this.interact.objectIndex = 0;

    const original = this.interact.triggerAction;

    this.interact.triggerAction = (verb, obj) => {
      // MEMORY MODE / TRAIL
      if (obj.index === "trail") {
        const finalRound =
          localStorage.getItem("memoryPuzzleComplete") === "true";

        if (finalRound) {
          // Final crash memory → back to office
          import("./office.js").then(({ OfficeScene }) =>
            this.manager.set(new OfficeScene(this.manager))
          );
        } else {
          this.returnToPuzzle();
        }
      }

      // OVERWORLD NETWORK
      else if (obj.index === "camp") {
        this.manager.set(new CampsiteScene(this.manager, { memoryMode: false }));
      } else if (obj.index === "cliff") {
        this.manager.set(new CliffScene(this.manager, { memoryMode: false }));
      } else if (obj.index === "crash") {
        this.manager.set(new CrashSiteScene(this.manager, { memoryMode: false }));
      }

      // cleanup
      this.currentObjectList = null;
      this.interact.triggerAction = original;
      this.interact.state = "explore";
    };
  }

  // -------------------------------------------------------------
  // OBJECTS (no MOVE objects here)
  // -------------------------------------------------------------
  buildObjects() {
    const objs = [];

    if (!this.inTrench) {
      objs.push({
        name: "Impact Trench",
        desc: "A long gouge torn across the hillside.",
        look: () =>
          this.say("Soil fused with char... this wasn’t a normal impact."),
        use: () => this.enterTrench()
      });

      objs.push({
        name: "Burn Pattern",
        desc: "Strange scorch marks spread outward in a unnatrual pattern.",
        look: () =>
          this.say(
            "The pattern almost looks intentional—like something traced itself across the earth."
          )
      });

      return objs;
    }

    // ------- Inside trench -------
    objs.push({
      name: "Trench Wall",
      desc: "Sharp glassy edges where the soil melted.",
      look: () => this.say("Sharp glassy edges where the soil melted.")
    });

    if (!this.hasCrystal) {
      objs.push({
        name: "Crystal",
        desc: "A translucent shard embedded in the ground.",
        look: () => this.say("A translucent shard embedded in the ground."),
        take: () => this.takeCrystal()
      });
    }

    objs.push({
      name: "Climb Out",
      desc: "Return to the surface above.",
      use: () => this.leaveTrench()
    });

    return objs;
  }

  // -------------------------------------------------------------
  // TRENCH LOGIC
  // -------------------------------------------------------------
  enterTrench() {
    this.inTrench = true;
    this.currentBG = this.hasCrystal ? this.bgTrenchAfter : this.bgTrench;
    this.objects = this.buildObjects();
    this.say("You slide down into the trench. The air vibrates around you.");
  }

  takeCrystal() {
    if (this.hasCrystal) return;

    this.hasCrystal = true;
    localStorage.setItem("inventory_crystal", "true");

    window.dispatchEvent(
      new CustomEvent("inventoryUpdate", {
        detail: { item: "Crystal" }
      })
    );

    this.currentBG = this.bgTrenchAfter;
    this.objects = this.buildObjects();

    this.say(
      "The crystal snaps free with a pulse of heat. It hums with a glowing impulse."
    );
  }

  leaveTrench() {
    this.inTrench = false;
    this.currentBG = this.bgDefault;
    this.objects = this.buildObjects();
    this.say("You climb back to the crash site above.");
  }

  // -------------------------------------------------------------
  say(text) {
    this.interact.dialogueLine = { text };
    this.interact.state = "dialogue";
  }

  returnToPuzzle() {
    this.manager.set(
      new CampsiteMemoryGridScene(this.manager, { resume: true })
    );
  }

  // -------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }

    // Sparkle animation
    if (this.inTrench && !this.hasCrystal) {
      this.sparkleFrameTimer += dt;
      if (this.sparkleFrameTimer > 80) {
        this.sparkleFrameTimer = 0;
        this.sparkleFrameIndex =
          (this.sparkleFrameIndex + 1) % this.sparkleFrames.length;
      }
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  render(ctx) {
    drawSceneImage(ctx, this.currentBG, ctx.canvas);

    // Sparkle effect
    if (this.inTrench && !this.hasCrystal) {
      const frame = this.sparkleFrames[this.sparkleFrameIndex];
      if (frame && frame.complete) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        const x = W * 0.70;
        const y = H * 0.65;

        const sparkleW = 140;
        const sparkleH = 140;

        ctx.drawImage(
          frame,
          x - sparkleW / 2,
          y - sparkleH / 2,
          sparkleW,
          sparkleH
        );
      }
    }

    const activeObjects = this.currentObjectList || this.objects;

    this.interact.render(ctx, activeObjects);
    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  // INPUT
  // -------------------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    if (this.justArrived) {
      this.justArrived = false;
      if (key === "escape") return;
    }

    const activeObjects =
      this.interact.state === "selectObject" &&
      this.interact.verbs[this.interact.verbIndex] === "Move"
        ? this.currentObjectList || []
        : this.currentObjectList || this.objects;

    const handled = this.interact.handleInput(e, activeObjects);

    if (handled) {
      // First Move → open custom selector
      if (
        this.interact.state === "selectObject" &&
        this.interact.verbs[this.interact.verbIndex] === "Move" &&
        !this.currentObjectList
      ) {
        this.openMoveSelector();
        return;
      }

      // Cleanup on exit back to explore
      if (this.interact.state === "explore") {
        this.currentObjectList = null;
        delete this.interact.triggerAction;
      }

      return;
    }

    // MEMORY MODE → ESC returns to puzzle
    if (this.memoryMode && key === "escape") {
      this.returnToPuzzle();
    }
  }
}
