// ---------- cliffScene.js ----------
// Cliff memory scene with dual-mode Move behavior (memoryMode vs overworldMode)

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";
import { CampsiteMemoryGridScene } from "./CampsiteMemoryGridScene.js";
import { CampsiteScene } from "./campsiteScene.js";
import { CrashSiteScene } from "./crashSiteScene.js";

export class CliffScene {
  constructor(manager, { memoryMode = true } = {}) {
    this.manager = manager;
    this.fade = 1;

    // Determines MOVE behavior:
    // memoryMode = true  → Move shows only "Trail" until puzzle fully complete
    // memoryMode = false → Move shows Campsite / Overlook / Trench
    this.memoryMode = memoryMode;
    this.canMove = true;

    this.canShowKeyBar = false;

    // Background
    this.bg = new Image();
    this.bg.src = "assets/memory_overlook.png";

    // Interaction core
    this.interact = new InteractionSystem(this);

    // Prevent immediate ESC bounce-back
    this.justArrived = true;

    // Whether memory monologue has been seen
    this.memoryGiven = localStorage.getItem("memory_cliff_hint") === "true";

    // Custom Move menu (like Diner)
    this.currentObjectList = null;

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  init() {
    this.fade = 1;
    this.interact.state = "explore";
    this.interact.dialogueLine = null;
  }

  // -------------------------------------------------------------
  // MOVE MENU
  // -------------------------------------------------------------
  openMoveSelector() {
    const puzzleDone =
      localStorage.getItem("memoryPuzzleComplete") === "true";

    if (!puzzleDone) {
      // Pre-complete: only Trail → puzzle
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
      // MEMORY / TRAIL MODE
      if (obj.index === "trail") {
        const finalRound =
          localStorage.getItem("memoryPuzzleComplete") === "true";

        if (finalRound) {
          // After final puzzle, Trail from crash returns to office.
          // Cliff’s Trail always goes back to puzzle.
          this.returnToPuzzle();
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

      // Cleanup
      this.currentObjectList = null;
      this.interact.triggerAction = original;
      this.interact.state = "explore";
    };
  }

  // -------------------------------------------------------------
  // CREATE OBJECTS
  // -------------------------------------------------------------
  buildObjects() {
    const objs = [];

    objs.push({
      name: "Cliff Edge",
      desc: "A steep drop overlooking the dark valley below.",
      look: () => {
        if (!this.memoryGiven) {
          this.memoryGiven = true;
          localStorage.setItem("memory_cliff_hint", "true");
          this.say(
            "This is where you first spottted what happened that night.\n" 
          );
        } else {
          this.say(
            "This is where you first spottted what happened that night."
          );
        }
      }
    });

    objs.push({
      name: "TreeLine",
      desc: "You can see a patch of trees knocked down from your vantage point.",
      look: () =>
        this.say("You can see a patch of trees knocked down from your vantage point.")
    });

    objs.push({
      name: "Distant Glow",
      desc: "A faint shimmer far across the valley.",
      look: () =>
        this.say(
          "Off in the distance, something is shimmering from amongst the trees."
        )
    });

    return objs;
  }

  // -------------------------------------------------------------
  // DIALOGUE HELPER
  // -------------------------------------------------------------
  say(text) {
    this.interact.dialogueLine = { text };
    this.interact.state = "dialogue";
  }

  // -------------------------------------------------------------
  // RETURN TO PUZZLE (memoryMode only)
  // -------------------------------------------------------------
  returnToPuzzle() {
    this.manager.set(
      new CampsiteMemoryGridScene(this.manager, { resume: true })
    );
  }

  // -------------------------------------------------------------
  // UPDATE / RENDER
  // -------------------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  render(ctx) {
    drawSceneImage(ctx, this.bg, ctx.canvas);

    const activeObjects =
      this.currentObjectList || this.objects;

    this.interact.render(ctx, activeObjects);
    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  // INPUT HANDLING
  // -------------------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // Prevent instant ESC-return on first frame
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
      // First time selecting Move → open our custom Move menu
      if (
        this.interact.state === "selectObject" &&
        this.interact.verbs[this.interact.verbIndex] === "Move" &&
        !this.currentObjectList
      ) {
        this.openMoveSelector();
        return;
      }

      // When InteractionSystem drops back to explore, clear temporary list
      if (this.interact.state === "explore") {
        this.currentObjectList = null;
        delete this.interact.triggerAction;
      }

      return;
    }

    // MEMORY MODE ONLY – ESC returns to puzzle
    if (this.memoryMode && key === "escape") {
      this.returnToPuzzle();
    }
  }
}
