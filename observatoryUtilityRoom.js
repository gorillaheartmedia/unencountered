// ---------- observatoryUtilityRoom.js ----------
// Observatory Utility Room — delivery shelf + fuse (Move-aware version)

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";

export class ObservatoryUtilityRoomScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = false;

    // ⭐ Disable Move here — single-location room
    this.canMove = false;

    this.bg = new Image();
    this.bg.src = "assets/observatory_utility.png";

    this.interact = new InteractionSystem(this);

    // Flags
    this.packageDelivered =
      localStorage.getItem("observatoryPackageDelivered") === "true";

    this.fuseTaken =
      localStorage.getItem("inventory_fuse") === "true";

    this.fusePermissionGiven =
      localStorage.getItem("observatoryFusePermission") === "true";

    // Dialogue queue support
    this.dialogueQueue = null;
    this.dialogueCallback = null;

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

  render(ctx) {
    drawSceneImage(ctx, this.bg, ctx.canvas);
    this.interact.render(ctx, this.objects);
    fadeOverlay(ctx, this.fade);
  }

  handleInput(e) {
    const handled = this.interact.handleInput(e, this.objects);
    if (handled) return;

    const key = e.key.toLowerCase();

    // ESC → return to main observatory
    if (key === "escape") {
      this.exitRoom();
    }
  }

  // -------------------------------------------------------------
  // OBJECT LIST (updated)
  // -------------------------------------------------------------
  buildObjects() {
    return [
      {
        name: "Delivery Shelf",
        desc: this.packageDelivered
          ? "The package sits neatly where you left it."
          : "A bare metal shelf for incoming deliveries.",
        use: () => this.placePackage()
      },
      {
        name: "Fuse",
        desc: this.fuseTaken
          ? "Only a dust-ring remains where the fuse used to sit."
          : "A spare fuse. The label says 'GENERAL EQUIPMENT'.",
        take: () => this.takeFuse()
      },
      {
        name: "Tools",
        desc: "Coils of wire, cutters, and maintenance gear. Nothing you need right now."
      },
      {
        name: "Maintenance Logbook",
        desc: "A thick binder of repair notes and calibration reports.",
        look: () => {
          this.interact.dialogueLine = {
            text: "Most entries are normal, but one page mentions Alex requesting privacy for an 'off-site experiment.'"
          };
          this.interact.state = "dialogue";
        }
      }
      // ⭐ Door removed — navigation handled by ESC / Move now
    ];
  }

  // -------------------------------------------------------------
  // DIALOGUE QUEUE (unchanged)
  // -------------------------------------------------------------
  queueDialogue(lines, callback) {
    this.dialogueQueue = [...lines];
    this.dialogueCallback = callback || null;

    const originalHandler = this.interact.handleInput.bind(this.interact);

    // first line
    this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
    this.interact.state = "dialogue";

    this.interact.handleInput = (e, objects) => {
      const key = e.key.toLowerCase();

      if (this.interact.state === "dialogue" && key === "enter") {
        if (this.dialogueQueue.length > 0) {
          this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
          return true;
        }

        // end of queue
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
  // ACTIONS
  // -------------------------------------------------------------
  placePackage() {
    const hasPackage =
      localStorage.getItem("inventory_observatoryPackage") === "true";

    if (!hasPackage) {
      this.queueDialogue([
        "You have nothing to place here."
      ]);
      return "";
    }

    // deliver package
    localStorage.setItem("observatoryPackageDelivered", "true");
    this.packageDelivered = true;

    localStorage.removeItem("inventory_observatoryPackage");

    // Unlock story systems
    localStorage.setItem("observatoryUnlocked", "true");
    localStorage.setItem("campUnlocked", "true");
    window.dispatchEvent(new CustomEvent("locationUpdate"));

    this.objects = this.buildObjects();

    this.queueDialogue([
      "You place the package gently on the shelf.",
      "It looks strangely out of place here… like it doesn’t belong.",
      "Better head back to the assistant and tell her it’s done."
    ]);

    return "";
  }

  takeFuse() {
    if (this.fuseTaken) {
      this.queueDialogue([
        "You already picked up the fuse."
      ]);
      return "";
    }

    if (!this.fusePermissionGiven) {
      this.queueDialogue([
        "You hesitate.",
        "There is something else you should be doing first."
      ]);
      return "";
    }

    // take fuse
    this.fuseTaken = true;
    localStorage.setItem("inventory_fuse", "true");
    localStorage.setItem("note_fuseFound", "true");

    window.dispatchEvent(
      new CustomEvent("inventoryUpdate", {
        detail: { item: "Fuse" }
      })
    );

    this.objects = this.buildObjects();

    this.queueDialogue([
      "You pick up the fuse.",
      "Don't worry, Alex has plenty of these in stock."
    ], () => {
      window.dispatchEvent(
        new CustomEvent("notesUpdate", {
          detail: {
            title: "Fuse",
            text: "Picked up a small fuse. Could fix dead electronics."
          }
        })
      );
    });

    return "";
  }

  exitRoom() {
    import("./observatoryMain.js").then(({ ObservatoryMainScene }) =>
      this.manager.set(new ObservatoryMainScene(this.manager))
    );
  }
}
