// ---------- observatoryControlDoor.js ----------
// Control Room Door — sealed door + keypad interaction
// UPDATED:
// - Properly enters ControlRoomScene when unlocked
// - Refreshes unlock state on init
// - Rebuilds objects after unlock
// - Adds door unlock / open sounds
// - Preserves dialogue queue system

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";

export class ObservatoryControlDoorScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = false;
    this.canMove = false;

    this.bg = new Image();
    this.bg.src = "assets/observatory_door.png";

    this.interact = new InteractionSystem(this);

    // Flags (refreshed in init)
    this.controlUnlocked = false;

    // Dialogue queue support
    this.dialogueQueue = null;
    this.dialogueCallback = null;

    // 🔊 Sounds
    this.soundUnlock = new Audio("assets/sounds/door_unlock.wav");
    this.soundOpen = new Audio("assets/sounds/door_open.wav");

    this.soundUnlock.preload = "auto";
    this.soundOpen.preload = "auto";

    this.objects = [];
  }

  // -------------------------------------------------------------
  init() {
    this.fade = 1;
    this.interact.state = "explore";
    this.interact.dialogueLine = null;

    // 🔄 Refresh unlock state EVERY time we enter this scene
    this.controlUnlocked =
      localStorage.getItem("controlRoomUnlocked") === "true";

    // Rebuild objects based on current state
    this.objects = this.buildObjects();
  }

  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

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
      this.goBack();
    }
  }

  // -------------------------------------------------------------
  // OBJECT LIST
  // -------------------------------------------------------------
  buildObjects() {
    const objs = [];

    // CONTROL DOOR
    objs.push({
      name: "Control Room Door",
      desc: this.controlUnlocked
        ? "The lock light glows green. The door is slightly ajar."
        : "A heavy sealed blast door. No handle on this side.",
      use: () => {
        if (this.controlUnlocked) return this.enterControlRoom();
        return this.tryLockedDoor();
      }
    });

    // KEYPAD (only when locked)
    if (!this.controlUnlocked) {
      objs.push({
        name: "Keypad",
        desc: "A QWERTY keypad, faintly glowing.",
        use: () => this.openKeypad()
      });
    }

    // SECURITY PANEL
    objs.push({
      name: "Security Panel",
      desc: "A dormant status console wired into the door assembly.",
      look: () => {
        this.interact.dialogueLine = {
          text:
            "Most indicators are offline… except one flashing entry:\n" +
            "'REMOTE LOCKDOWN – INITIATED BY A. ROTH'"
        };
        this.interact.state = "dialogue";

        // Notebook: deliver the observatory package (once)
        if (!localStorage.getItem('note_dropObservatoryPackage')) {
          localStorage.setItem('note_dropObservatoryPackage', 'true');
          window.dispatchEvent(new CustomEvent('notesUpdate', {
            detail: {
              title: 'Deliver Observatory Package',
              text: 'Take the sealed package to the Observatory assistant. No questions asked.'
            }
          }));
        }
      }
    });

    return objs;
  }

  // ======================================================================
  //  UNIVERSAL DIALOGUE QUEUE
  // ======================================================================
  queueDialogue(lines, callback) {
    this.dialogueQueue = [...lines];
    this.dialogueCallback = callback || null;

    const originalHandler = this.interact.handleInput.bind(this.interact);

    this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
    this.interact.state = "dialogue";

    this.interact.handleInput = (e, objects) => {
      const key = e.key.toLowerCase();

      if (this.interact.state === "dialogue" && key === "enter") {
        if (this.dialogueQueue.length > 0) {
          this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
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

  // ======================================================================
  //  DOOR LOGIC
  // ======================================================================
  tryLockedDoor() {
    this.queueDialogue([
      "You push gently on the heavy door.",
      "It doesn’t move — the locking mechanism holds firm."
    ]);
    return "";
  }

  enterControlRoom() {
    // 🔊 Door opening sound
    this.soundOpen.currentTime = 0;
    this.soundOpen.play().catch(() => {});

    this.queueDialogue(
      [
        "You pull the door open.",
        "A faint breeze rushes out — the air inside is colder."
      ],
      () => {
        import("./controlRoomScene.js").then(
          ({ ControlRoomScene }) => {
            this.manager.set(new ControlRoomScene(this.manager));
          }
        );
      }
    );
    return "";
  }

  // ======================================================================
  //  KEYPAD TRANSITION
  // ======================================================================
  openKeypad() {
    import("./observatoryKeypad.js").then(
      ({ ObservatoryKeypadScene }) => {
        this.manager.set(new ObservatoryKeypadScene(this.manager));
      }
    );
  }

  // ======================================================================
  //  EXIT BACK TO MAIN AREA
  // ======================================================================
  goBack() {
    import("./observatoryMain.js").then(
      ({ ObservatoryMainScene }) =>
        this.manager.set(new ObservatoryMainScene(this.manager))
    );
  }
}
