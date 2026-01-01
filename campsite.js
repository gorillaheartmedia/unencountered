// ---------- campsite.js ----------
// Campsite Scene — Where Alex may have gone.
// Includes atmospheric objects, a clue item, and queueDialogue support.

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";

export class CampsiteScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = true;

    this.bg = new Image();
    this.bg.src = "assets/campsite_bg.png";

    this.interact = new InteractionSystem(this);

    // Dialogue queue
    this.dialogueQueue = null;
    this.dialogueCallback = null;

    // Flags
    this.noteTaken = localStorage.getItem("campsiteNoteTaken") === "true";

    this.objects = this.buildObjects();
  }

  init() {
    this.fade = 1;
    this.interact.state = "explore";
    this.interact.dialogueLine = null;
  }

  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  render(ctx) {
    drawSceneImage(ctx, this.bg, ctx.canvas);

    this.interact.render(ctx, this.objects);
    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  handleInput(e) {
    const handled = this.interact.handleInput(e, this.objects);
    if (handled) return;

    if (e.key.toLowerCase() === "escape") {
      // ESC returns to Office
      import("./office.js").then(({ OfficeScene }) =>
        this.manager.set(new OfficeScene(this.manager))
      );
    }
  }

  // =====================================================================
  //  queueDialogue — same as Observatory & Warehouse
  // =====================================================================
  queueDialogue(lines, callback) {
    this.dialogueQueue = [...lines];
    this.dialogueCallback = callback || null;

    const originalHandler = this.interact.handleInput.bind(this.interact);

    // First line
    this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
    this.interact.state = "dialogue";

    this.interact.handleInput = (e, objects) => {
      const key = e.key.toLowerCase();

      if (this.interact.state === "dialogue" && key === "enter") {
        if (this.dialogueQueue.length > 0) {
          this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
          return true;
        }

        // End dialogue
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

    if (this.dialogueCallback)
      this.dialogueCallback();
  }

  // -------------------------------------------------------------
  // OBJECTS
  // -------------------------------------------------------------
  buildObjects() {
    return [
      {
        name: "Tent",
        desc: "A small tent sits half-collapsed. The ground around it is disturbed.",
        look: () => "It looks like someone left in a hurry…"
      },
      {
        name: "Fire Pit",
        desc: "Cold ashes. Whatever fire once burned here has long gone out.",
        look: () => "The ashes are still soft. This wasn’t long ago."
      },
      {
        name: "Backpack",
        desc: "An abandoned pack. One of the straps is torn.",
        look: () => "Inside are scraps of wrappers, a cracked mug, and a faint smell of coffee."
      },
      {
        name: "Crumbled Note",
        desc: this.noteTaken
          ? "You already took the note."
          : "A small paper caught under a rock.",
        use: () => this.takeNote(),
        take: () => this.takeNote()
      },
      {
        name: "Trail",
        desc: "A faint path leading deeper into the woods.",
        look: () => {
          this.queueDialogue([
            "You step toward the trail.",
            "There's a strange stillness — no wind, no birdsong.",
            "Whatever this place is… it feels watched."
          ]);
          return "";
        }
      },
      {
        name: "Return",
        desc: "Head back to the Office.",
        use: () => this.goBack()
      }
    ];
  }

  // -------------------------------------------------------------
  // TAKE NOTE — adds clue to notebook
  // -------------------------------------------------------------
  takeNote() {
    if (this.noteTaken) {
      this.queueDialogue(["There’s nothing left to take."]);
      return "";
    }

    this.noteTaken = true;
    localStorage.setItem("campsiteNoteTaken", "true");
    localStorage.setItem("inventory_campsiteNote", "true");

    // Add to notebook
    window.dispatchEvent(
      new CustomEvent("notesUpdate", {
        detail: {
          title: "Crumbled Note",
          text: "A hastily written phrase: “NOTHING HERE IS AS IT SEEMS.”"
        }
      })
    );

    this.queueDialogue([
      "You lift the note carefully.",
      "The handwriting is shaky… rushed.",
      "A chill runs through you as the message sinks in."
    ]);

    this.objects = this.buildObjects();
    return "";
  }

  // -------------------------------------------------------------
  goBack() {
    import("./office.js").then(({ OfficeScene }) =>
      this.manager.set(new OfficeScene(this.manager))
    );
  }
}
