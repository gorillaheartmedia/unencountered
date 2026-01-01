// ---------- observatoryMain.js ----------
// Observatory Main Area — Assistant, Utility Door, Control Door.
// With Move-enabled navigation + story gating.

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";

export class ObservatoryMainScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    // ⭐ Allow Move verb
    this.canMove = true;
    this.canShowKeyBar = false;

    // Background
    this.bg = new Image();
    this.bg.src = "assets/observatory_main.png";

    // Assistant portrait
    this.assistant = new Image();
    this.assistant.src = "assets/assistant.png";

    // Interaction
    this.interact = new InteractionSystem(this);

    // Dialogue queue support
    this.dialogueQueue = null;
    this.dialogueCallback = null;

    // Flags
    this.packageDelivered =
      localStorage.getItem("observatoryPackageDelivered") === "true";

    this.assistantSpoken =
      localStorage.getItem("observatoryAssistantSpoken") === "true";

    this.fusePermissionGiven =
      localStorage.getItem("observatoryFusePermission") === "true";

    // ⭐ Star chart reaction (STATE-BASED)
    this.starChartReacted =
      localStorage.getItem("observatory_starChartReacted") === "true";

    // ⭐ MOVE DESTINATIONS WITH ACTIONS
    this.roomNames = [
      { name: "Main Level", action: () => this.returnToMain() },
      { name: "Utility Room", action: () => this.attemptUtilityMove() },
      { name: "Control Room Entrance", action: () => this.attemptControlMove() }
    ];

    this.currentObjectList = null;

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  init() {
    this.fade = 1;
    this.interact.state = "explore";
    this.interact.dialogueLine = null;

    // ✅ STATE-BASED STAR CHART REACTION
    if (
      localStorage.getItem("starChartSolved") === "true" &&
      !this.starChartReacted
    ) {
      this.onStarChartComplete();
    }
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
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    drawSceneImage(ctx, this.bg, ctx.canvas);

    // Assistant portrait
    if (this.assistant.complete && this.assistant.naturalWidth > 0) {
      const h = H * 0.55;
      const w = this.assistant.width * (h / this.assistant.height);
      ctx.drawImage(this.assistant, W * 0.05, H - h - 10, w, h); // lowered portrait
    }

    const activeObjects = this.currentObjectList || this.objects;

    this.interact.render(ctx, activeObjects);
    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  // MOVE-INTEGRATED INPUT HANDLER
  // -------------------------------------------------------------
  handleInput(e) {
    const activeObjects =
      (this.interact.state === "selectObject" &&
       this.interact.verbs[this.interact.verbIndex] === "Move")
        ? this.currentObjectList || []
        : this.currentObjectList || this.objects;

    const handled = this.interact.handleInput(e, activeObjects);

    if (handled) {
      if (
        this.interact.state === "selectObject" &&
        this.interact.verbs[this.interact.verbIndex] === "Move" &&
        !this.currentObjectList
      ) {
        this.openMoveSelector();
        return;
      }

      if (this.interact.state === "explore") {
        this.currentObjectList = null;
        delete this.interact.triggerAction;
      }

      return;
    }

    // ESC → return to office
    if (e.key.toLowerCase() === "escape") {
      this.currentObjectList = null;
      delete this.interact.triggerAction;

      import("./office.js").then(({ OfficeScene }) =>
        this.manager.set(new OfficeScene(this.manager))
      );
    }
  }

  // -------------------------------------------------------------
  // MOVE SELECTOR BUILDER
  // -------------------------------------------------------------
  openMoveSelector() {
    this.interact.state = "selectObject";
    this.interact.objectIndex = 0;

    this.currentObjectList = this.roomNames.map(r => ({
      name: r.name,
      action: r.action
    }));

    this.interact.triggerAction = (verb, obj) => {
      obj.action();
      this.currentObjectList = null;
      delete this.interact.triggerAction;
      this.interact.state = "explore";
    };
  }

  // -------------------------------------------------------------
  // MOVE ACTIONS
  // -------------------------------------------------------------
  returnToMain() {
    this.manager.set(new ObservatoryMainScene(this.manager));
  }

  attemptUtilityMove() {
    const hasPackage =
      localStorage.getItem("inventory_observatoryPackage") === "true";

    if (!this.assistantSpoken && hasPackage) {
      this.interact.dialogueLine = {
        text: "You should speak to the assistant first."
      };
      this.interact.state = "dialogue";
      return;
    }

    this.goToUtilityRoom();
  }

  attemptControlMove() {
    const hasPackage =
      localStorage.getItem("inventory_observatoryPackage") === "true";

    if (!this.packageDelivered && hasPackage) {
      this.interact.dialogueLine = {
        text: "The assistant said to drop off the package in the Utility Room first."
      };
      this.interact.state = "dialogue";
      return;
    }

    this.goToControlDoor();
  }

  goToUtilityRoom() {
    import("./observatoryUtilityRoom.js").then(
      ({ ObservatoryUtilityRoomScene }) =>
        this.manager.set(new ObservatoryUtilityRoomScene(this.manager))
    );
  }

  goToControlDoor() {
    import("./observatoryControlDoor.js").then(
      ({ ObservatoryControlDoorScene }) =>
        this.manager.set(new ObservatoryControlDoorScene(this.manager))
    );
  }

  // =====================================================================
  // DIALOGUE QUEUE
  // =====================================================================
  queueDialogue(lines, callback) {
    this.dialogueQueue = [...lines];
    this.dialogueCallback = callback || null;

    const originalHandler = this.interact.handleInput.bind(this.interact);

    this.interact.dialogueLine = { text: this.dialogueQueue.shift() };
    this.interact.state = "dialogue";

    this.interact.handleInput = (e, objects) => {
      if (e.key.toLowerCase() === "enter") {
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

  // -------------------------------------------------------------
  // OBJECT LIST
  // -------------------------------------------------------------
  buildObjects() {
    return [
      {
        name: "Assistant",
        desc: "Alex’s lab assistant. She keeps glancing at the sealed control room.",
        speak: () => this.speakToAssistant()
      },
      {
        name: "Equipment",
        desc: "Telemetry consoles hum steadily."
      },
      {
        name: "Lab Notes",
        desc: "A clipboard filled with scribbled equations and off-hour telescope logs.",
        look: () => {
          this.interact.dialogueLine = {
            text: "Most of the notes reference star charts… but a few pages are missing."
          };
          this.interact.state = "dialogue";
        }
      }
    ];
  }

  // ---------------------------------------------------------
  // STAR CHART REACTION (STATE-BASED, RELIABLE)
  // ---------------------------------------------------------
  onStarChartComplete() {
    if (this.starChartReacted) return;

    this.starChartReacted = true;
    localStorage.setItem("observatory_starChartReacted", "true");

    // Bracketed future logic
    localStorage.setItem("phase5_ready", "true");
    localStorage.setItem("downtownMazeUnlocked", "true");

    this.queueDialogue([
      "Assistant: “That configuration…”",
      "Assistant: “Alex believed he was picking up radio activity from that region.”",
      "Assistant: “He barely slept after that.”",
      "Assistant: “He left directions once—on a clipboard.”",
      "Assistant: “From Cedar Ave…”",
      "Assistant: “S, E, N, N, N, W.”"
    ]);
  }

  // ---------------------------------------------------------
  // ASSISTANT DIALOGUE
  // ---------------------------------------------------------
  speakToAssistant() {
    const hasPackage =
      localStorage.getItem("inventory_observatoryPackage") === "true";

    if (!this.assistantSpoken && hasPackage) {
      this.assistantSpoken = true;
      localStorage.setItem("observatoryAssistantSpoken", "true");
      localStorage.setItem("observatoryFusePermission", "true");

      this.queueDialogue([
        "Assistant: “If that’s the delivery, it goes in the Utility Room.”",
        "Assistant: “Head through the door on the left—Alex usually handles these.”",
        "Assistant: “But he hasn’t shown up in days…”",
        "Assistant: “Drop it off and come back. I need to talk to you.”"
      ]);
      return "";
    }

    if (this.packageDelivered) {
      localStorage.setItem("campsiteUnlocked", "true");
      window.dispatchEvent(new Event("locationUpdate"));

      if (!localStorage.getItem("note_alexCampsiteHint")) {
        localStorage.setItem("note_alexCampsiteHint", "true");
        window.dispatchEvent(
          new CustomEvent("notesUpdate", {
            detail: {
              title: "Campsite Lead",
              text: "Assistant hinted Alex may have gone camping. Check the campsite for clues."
            }
          })
        );
      }

      if (!localStorage.getItem("note_sewerDirections")) {
        localStorage.setItem("note_sewerDirections", "true");
        window.dispatchEvent(
          new CustomEvent("notesUpdate", {
            detail: {
              title: "Sewer Directions",
              text: "Clipboard note from the assistant: Cedar Ave → S, E, N, N, N, W."
            }
          })
        );
      }

      this.queueDialogue([
        "Assistant: “Thanks for taking care of that.”",
        "Assistant: “Everything here works, but the Control Room is still locked.”",
        "Assistant: “Alex changed the password recently.”",
        "Assistant: “He kept talking about needing space…”",
        "Assistant: “Some campsite he wanted to visit.”",
        "Assistant: “Maybe go there, that's likely the last place he went.",
      ]);
      return "";
    }

    this.queueDialogue([
      "Assistant: “Please leave the package in the Utility Room first.”"
    ]);
    return "";
  }
}
