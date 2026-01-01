// ---------- campsiteScene.js ----------
// Campsite memory scene with proper MOVE support (Trail pre-puzzle, full travel post-puzzle)

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";

export class CampsiteScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = false;

    // ⭐ Campsite supports MOVE verb now
    this.canMove = true;

    // For Diner-style MOVE menu override
    this.currentObjectList = null;

    // Scene backgrounds
    this.bgDefault = new Image();
    this.bgDefault.src = "assets/memory_campsite.png";

    this.bgMatches = new Image();
    this.bgMatches.src = "assets/matches1.png";

    this.bgMatchesTaken = new Image();
    this.bgMatchesTaken.src = "assets/matches2.png";

    this.currentBG = this.bgDefault;

    this.interact = new InteractionSystem(this);

    this.hasMatchbook =
      localStorage.getItem("inventory_matchbook") === "true";

    this.matchesExamined = false;
    this.justArrived = true;

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  init() {
    this.fade = 1;
    this.interact.state = "explore";
    this.interact.dialogueLine = null;

    if (this.hasMatchbook) {
      this.matchesExamined = true;
      this.currentBG = this.bgDefault;
    }
  }

  // -------------------------------------------------------------
  // Objects (normal verbs only — Move handled separately)
  // -------------------------------------------------------------
  buildObjects() {
    const list = [
      {
        name: "Tent",
        desc: "A small canvas tent, the flap slightly open.",
        look: () =>
          this.say("This is Alex’s tent. He must have been here recently."),
        use: () => this.useTent()
      },
      {
        name: "Campfire",
        desc: "Cold ashes arranged in a tight circle.",
        look: () =>
          this.say("This is where we always had the fire burning. Not tonight.")
      }
    ];

    if (this.matchesExamined || this.hasMatchbook) {
      list.push({
        name: "Matches",
        desc: "A small matchbook rests near the tent entrance.",
        look: () => this.examineMatches(),
        take: () => this.takeMatchbook()
      });
    }

    return list;
  }

  // -------------------------------------------------------------
  // MOVE SUPPORT (Diner-style override)
  // -------------------------------------------------------------
  openMoveSelector() {
    const puzzleDone =
      localStorage.getItem("memoryPuzzleComplete") === "true";

    // ⭐ PRE-PUZZLE → only “Trail”
    if (!puzzleDone) {
      this.currentObjectList = [{ name: "Trail", index: "trail" }];
    }

    // ⭐ POST-PUZZLE → full memory travel unlocked
    else {
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
      if (obj.index === "trail") {
        this.returnToPuzzle();
      } else if (obj.index === "camp") {
        this.manager.set(new CampsiteScene(this.manager));
      } else if (obj.index === "cliff") {
        import("./cliffScene.js").then(({ CliffScene }) =>
          this.manager.set(new CliffScene(this.manager))
        );
      } else if (obj.index === "crash") {
        import("./crashSiteScene.js").then(({ CrashSiteScene }) =>
          this.manager.set(new CrashSiteScene(this.manager))
        );
      }

      // cleanup
      this.currentObjectList = null;
      this.interact.triggerAction = original;
      this.interact.state = "explore";
    };
  }

  // -------------------------------------------------------------
  // TENT / MATCHES
  // -------------------------------------------------------------
  useTent() {
    if (this.hasMatchbook) {
      this.say("Nothing else inside. Just scraps of fabric and cold air.");
      return;
    }

    if (!this.matchesExamined) {
      this.matchesExamined = true;
      this.currentBG = this.bgMatches;
      this.objects = this.buildObjects();
      this.say(
        "Right by the entrance… a matchbook.."
      );
      return;
    }

    this.say("The matchbook is still sitting by the entrance.");
  }

  examineMatches() {
    if (this.hasMatchbook) {
      this.say("Nothing else here.");
      return;
    }

    if (!this.matchesExamined) {
      this.say("I should check the tent first.");
      return;
    }

    this.currentBG = this.bgMatches;
    this.say("Alex always carried this brand…");
  }

  takeMatchbook() {
    if (this.hasMatchbook) return;

    if (!this.matchesExamined) {
      this.say("I should look at the tent first.");
      return;
    }

    this.currentBG = this.bgMatchesTaken;

    this.hasMatchbook = true;
    localStorage.setItem("inventory_matchbook", "true");
    localStorage.setItem("note_matchesFound", "true");

    window.dispatchEvent(
      new CustomEvent("inventoryUpdate", {
        detail: { item: "Matchbook" }
      })
    );

    window.dispatchEvent(
      new CustomEvent("notesUpdate", {
        detail: {
          title: "Matches",
          text: "A book of matches. Might be useful for light—or something else."
        }
      })
    );

    this.say("A matchbook. Perhaps it would be beneficial to examine them more closely.");

    const originalHandler = this.interact.handleInput.bind(this.interact);

    this.interact.handleInput = (e, objs) => {
      const key = e.key.toLowerCase();

      if (
        (key === "enter" || key === "escape") &&
        this.interact.state === "dialogue"
      ) {
        this.currentBG = this.bgDefault;
        this.interact.state = "explore";
        this.interact.dialogueLine = null;

        this.objects = this.buildObjects();

        this.interact.handleInput = originalHandler;
        return true;
      }

      return originalHandler(e, objs);
    };
  }

  // -------------------------------------------------------------
  say(text) {
    this.interact.dialogueLine = { text };
    this.interact.state = "dialogue";
  }

  returnToPuzzle() {
    import("./CampsiteMemoryGridScene.js").then(
      ({ CampsiteMemoryGridScene }) =>
        this.manager.set(
          new CampsiteMemoryGridScene(this.manager, { resume: true })
        )
    );
  }

  // -------------------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  render(ctx) {
    drawSceneImage(ctx, this.currentBG, ctx.canvas);

    // 🔑 This is the critical fix: pass the right list to render()
    const activeObjects =
      this.currentObjectList || this.objects;

    this.interact.render(ctx, activeObjects);
    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  // INPUT HANDLING — mirrors Diner’s pattern
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
      // First time ENTER on Move → open Move menu
      if (
        this.interact.state === "selectObject" &&
        this.interact.verbs[this.interact.verbIndex] === "Move" &&
        !this.currentObjectList
      ) {
        this.openMoveSelector();
        return;
      }

      // When we drop back to explore, clear Move menu
      if (this.interact.state === "explore") {
        this.currentObjectList = null;
        delete this.interact.triggerAction;
      }

      return;
    }

    if (key === "escape") {
      this.returnToPuzzle();
    }
  }
}
