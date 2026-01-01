// ---------- bunkerDoor.js ----------
// Underground Bunker Door
// Final gate before endgame interior
// Requires Keycard acquired earlier in the game
// Point of no return — ESC disabled

import { BaseInteractiveScene } from "./BaseInteractiveScene.js";
import { drawSceneImage, fadeOverlay } from "./renderUtils.js";

export class BunkerDoorScene extends BaseInteractiveScene {
  constructor(manager) {
    super(manager);

    this.sceneType = "interactive";
    this.canMove = false;
    this.canShowKeyBar = false;

    this.fade = 1;

    // -------------------------------------------------
    // Persistent flags
    // -------------------------------------------------
    this.hasKeycard =
      localStorage.getItem("inventory_keycard") === "true";

    this.doorOpened =
      localStorage.getItem("bunkerDoorOpened") === "true";

    this.keycardRecognized =
      localStorage.getItem("bunkerKeycardRecognized") === "true";

    // -------------------------------------------------
    // Backgrounds
    // -------------------------------------------------
    this.bgLocked = new Image();
    this.bgLocked.src = "assets/bunker_door.png";

    this.bgOpen = new Image();
    this.bgOpen.src = "assets/bunker_door_open.png";

    // -------------------------------------------------
    // Objects
    // -------------------------------------------------
    this.objects = this.buildObjects();
  }

  // -------------------------------------------------
  init() {
    this.fade = 1;

    // One-time arrival text
    if (!localStorage.getItem("bunkerDoorSeen")) {
      localStorage.setItem("bunkerDoorSeen", "true");

      this.interact.dialogueLine = {
        text:
          "The tunnel opens into a reinforced chamber.\n\n" +
          "A heavy security door blocks the way forward.\n" +
          "No keypad. No markings.\n" +
          "Only a magnetic card reader."
      };
      this.interact.state = "dialogue";
    }
  }

  // -------------------------------------------------
  // HARD LOCK ESC — FINAL GATE
  // -------------------------------------------------
  handleInput(e) {
    if (e.key.toLowerCase() === "escape") {
      this.interact.dialogueLine = {
        text: "There is no way back."
      };
      this.interact.state = "dialogue";
      return true;
    }

    return super.handleInput(e);
  }

  // -------------------------------------------------
  getActiveObjects() {
    return this.objects;
  }

  // -------------------------------------------------
  buildObjects() {
    return [
      {
        name: "Security Door",
        desc: this.doorOpened
          ? "The bunker door stands open."
          : "A reinforced steel door with a magnetic card reader.",
        use: () => this.useDoor()
      },
      {
        name: "Card Reader",
        desc: this.hasKeycard
          ? "A faint green LED pulses, waiting for authorization."
          : "The reader is dark and unresponsive.",
        look: () => this.lookAtReader(),
        use: () => this.useCardReader()
      }
    ];
  }

  // -------------------------------------------------
  lookAtReader() {
    if (!this.hasKeycard) {
      this.interact.dialogueLine = {
        text:
          "There’s no interface.\n\n" +
          "Whatever opens this door isn’t something you can guess."
      };
      this.interact.state = "dialogue";
      return;
    }

    if (!this.keycardRecognized) {
      this.keycardRecognized = true;
      localStorage.setItem("bunkerKeycardRecognized", "true");

      this.interact.dialogueLine = {
        text:
          "The reader emits a low tone.\n\n" +
          "It recognizes the card immediately.\n" +
          "This wasn’t a generic access badge.\n\n" +
          "Whoever carried it was meant to be here."
      };
      this.interact.state = "dialogue";
      return;
    }

    this.interact.dialogueLine = {
      text:
        "Authorization is already established.\n\n" +
        "The system waits for confirmation."
    };
    this.interact.state = "dialogue";
  }

  // -------------------------------------------------
  // DOOR LOGIC
  // -------------------------------------------------
  useDoor() {
    this.engageAccess(false);
  }

  useCardReader() {
    this.engageAccess(true);
  }

  engageAccess(fromReader) {
    if (this.doorOpened) {
      this.enterBunker();
      return;
    }

    if (!this.hasKeycard) {
      this.interact.dialogueLine = {
        text:
          fromReader
            ? "The reader stays dark. You need a keycard."
            : "You press against the door.\n\nNothing happens.\nWithout clearance, it might as well be a wall."
      };
      this.interact.state = "dialogue";
      return;
    }

    // Unlock sequence
    this.doorOpened = true;
    localStorage.setItem("bunkerDoorOpened", "true");

    this.interact.dialogueLine = {
      text:
        "You slide the keycard through the reader.\n\n" +
        "A green light flashes.\n" +
        "The system doesn't hesitate.\n\n" +
        "The locks disengage with a deep metallic thud."
    };
    this.interact.state = "dialogue";

    this.objects = this.buildObjects();

    // Engine-consistent dialogue completion
    const originalHandler =
      this.interact.handleInput.bind(this.interact);

    this.interact.handleInput = (e) => {
      if (e.key.toLowerCase() === "enter") {
        this.interact.dialogueLine = null;
        this.interact.state = "explore";
        this.interact.handleInput = originalHandler;
        return true;
      }
      return originalHandler(e);
    };
  }

  // -------------------------------------------------
  // TRANSITION TO FINAL INTERIOR
  // -------------------------------------------------
  enterBunker() {
    import("./finalInterior.js").then(
      ({ FinalInteriorScene }) => {
        this.manager.set(
          new FinalInteriorScene(this.manager)
        );
      }
    );
  }

  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  // -------------------------------------------------
  render(ctx) {
    const bg = this.doorOpened
      ? this.bgOpen
      : this.bgLocked;

    drawSceneImage(ctx, bg, ctx.canvas);
    super.render(ctx);
    fadeOverlay(ctx, this.fade);
  }
}
