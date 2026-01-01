// ---------- apartmentInterior.js ----------
// Alex's dark apartment interior (PHASE 3)
// FULLY STANDARDIZED interactive scene
//
// ✔ Uses BaseInteractiveScene
// ✔ Verb list enabled
// ✔ Matchbook lighting works
// ✔ Notes reveal + inventory works
// ✔ Phase 2 first-entry phone trigger preserved
// ✔ Phase 4 arming preserved
// ✔ Darkness logic intact
// ✔ No truncation, no missing logic

import { BaseInteractiveScene } from "./BaseInteractiveScene.js";
import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { ApartmentHallwayScene } from "./ApartmentHallwayScene.js";

export class ApartmentInteriorScene extends BaseInteractiveScene {
  constructor(manager) {
    super(manager);

    // -------------------------------------------------------------
    // Scene identity
    // -------------------------------------------------------------
    this.sceneType = "interactive";
    this.canMove = false;

    this.manager = manager;
    this.fade = 1;

    // -------------------------------------------------------------
    // Inventory checks (⚠ MUST MATCH inventoryOverlay.js KEYS)
    // -------------------------------------------------------------
    this.hasMatchbook =
      localStorage.getItem("inventory_matchbook") === "true";

    this.hasAlexNotes =
      localStorage.getItem("inventory_alexnotes") === "true";

    // -------------------------------------------------------------
    // Match-light animation state
    // -------------------------------------------------------------
    this.matchActive = false;
    this.frames = [];
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameRate = 70; // ms per frame (~14 FPS)

    // White flicker on match strike
    this.whiteFlash = false;
    this.whiteFlashTimer = 0;
    this.whiteFlashDuration = 90; // ms

    // Default dark background
    this.bg = new Image();
    this.bg.src = "assets/apartment_interior.png";

    // -------------------------------------------------------------
    // Phase 2 first-entry trigger (unchanged behavior)
    // -------------------------------------------------------------
    this.firstEntry =
      localStorage.getItem("phase2_enteredApartment") !== "true";

    // Sound for striking the match
    this.strikeSound = new Audio("assets/sounds/fire.wav");
    this.strikeSound.volume = 0.8;
    this.strikeSound.preload = "auto";

    // Preload animation frames
    this.preloadFrames();

    // Build objects
    this.objects = this.buildObjects();

    // Scene-specific guard: block Look when it's dark (except Matchbook)
    const originalTrigger = this.interact.triggerAction.bind(this.interact);
    this.interact.triggerAction = (verb, obj) => {
      if (verb === "Look" && this.isDark() && obj?.name !== "Matchbook") {
        this.interact.dialogueLine = { text: "It's too dark to see." };
        this.interact.state = "dialogue";
        return;
      }
      return originalTrigger(verb, obj);
    };
  }

  // -------------------------------------------------------------
  // REQUIRED FOR VERB SYSTEM
  // -------------------------------------------------------------
  getActiveObjects() {
    return this.objects;
  }

  // -------------------------------------------------------------
  // LOAD MATCH ANIMATION FRAMES (0–42)
  // -------------------------------------------------------------
  preloadFrames() {
    const total = 43;
    for (let i = 0; i < total; i++) {
      const img = new Image();
      const num = String(i).padStart(4, "0");
      img.src = `assets/apartment/apartment${num}.png`;
      this.frames.push(img);
    }
  }

  // -------------------------------------------------------------
  // DARKNESS RULE
  // -------------------------------------------------------------
  isDark() {
    return !this.matchActive;
  }

  // -------------------------------------------------------------
  // OBJECT DEFINITIONS
  // -------------------------------------------------------------
  buildObjects() {
    const list = [];

    // LIGHT SWITCH
    list.push({
      name: "Lightswitch",
      desc: "A switch on the wall. It doesn't respond.",
      look: () => "You try the light switch but nothing happens.",
      use: () => {
        this.interact.dialogueLine = {
          text: "You try the light switch but nothing happens."
        };
        this.interact.state = "dialogue";
      }
    });

    // LIVING ROOM
    list.push({
      name: "Living Room",
      desc: "Sparse furniture. Dust everywhere.",
      look: () => {
        if (this.isDark()) return "It's too dark to see anything.";
        return "Sparse furniture… dust everywhere. Someone left in a hurry.";
      }
    });

    // DESK
    list.push({
      name: "Desk",
      desc: "A cluttered desk.",
      look: () => {
        if (this.isDark()) return "It's too dark to see anything.";

        if (!this.hasAlexNotes) {
          return "Loose papers scatter the desk. One small stack looks important—maybe you should take a closer look.";
        }

        return "Just scraps now. You already took the important notes.";
      }
    });

    // NOTES (only visible when lit)
    if (!this.isDark() && !this.hasAlexNotes) {
      list.push({
        name: "Notes",
        desc: "A small stack of lab notes.",
        look: () =>
          "Handwritten lab notes. Some lines are circled and underlined.",
        take: () => this.takeNotes()
      });
    }

    // MATCHBOOK
    if (this.hasMatchbook) {
      list.push({
        name: "Matchbook",
        desc: this.matchActive
          ? "A lit match flickers in your hand."
          : "Alex's old matchbook.",
        use: () => this.useMatchbook()
      });
    }

    // EXIT
    list.push({
      name: "Exit",
      desc: "Return to the hallway.",
      use: () => {
        this.resetLighting();
        this.manager.set(new ApartmentHallwayScene(this.manager));
      }
    });

    return list;
  }

  // -------------------------------------------------------------
  // TAKE NOTES → INVENTORY + PHASE 4 ARM
  // -------------------------------------------------------------
  takeNotes() {
    if (this.isDark()) {
      this.interact.dialogueLine = {
        text: "It's too dark to see anything."
      };
      this.interact.state = "dialogue";
      return;
    }

    if (this.hasAlexNotes) {
      this.interact.dialogueLine = {
        text: "You already took the notes."
      };
      this.interact.state = "dialogue";
      return;
    }

    // Inventory state
    this.hasAlexNotes = true;
    localStorage.setItem("inventory_alexnotes", "true");
    localStorage.setItem("note_alexLabNotes", "true");

    window.dispatchEvent(
      new CustomEvent("inventoryUpdate", {
        detail: { item: "Alex’s Notes" }
      })
    );

    window.dispatchEvent(
      new CustomEvent("notesUpdate", {
        detail: {
          title: "Alex’s Lab Notes",
          text: "Recovered Alex’s lab notes from his apartment. Sketches of containment seals and strange symbols."
        }
      })
    );

    // -------------------------------------------------------------
    // ARM PHASE 4 (POLICE CALL)
    // -------------------------------------------------------------
    localStorage.setItem("phase4_ready", "true");
    localStorage.removeItem("phase3_ready");
    localStorage.removeItem("phase3_started");

    window.dispatchEvent(
      new CustomEvent("phoneUpdate", {
        detail: { source: "alexNotesTaken" }
      })
    );

    this.interact.dialogueLine = {
      text:
        "These must be Alex’s notes.\n\n" +
        "Most of it is technical jargon, but one line is circled:\n" +
        "“JUKEBOX — THIRD WORD — C-7”"
    };

    this.interact.state = "dialogue";

    // Rebuild objects (remove Notes)
    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  init() {
    this.fade = 1;

    // Phase 2 first-entry trigger (UNCHANGED)
    if (this.firstEntry) {
      this.firstEntry = false;

      localStorage.setItem("phase2_enteredApartment", "true");
      localStorage.setItem("daveCallUnlocked", "true");

      window.dispatchEvent(
        new CustomEvent("phoneUpdate", {
          detail: { source: "apartmentInterior" }
        })
      );

      this.interact.dialogueLine = {
        text:
          "Alex doesn’t appear to be here right now. Maybe I should come back later."
      };

      this.interact.state = "dialogue";
    }

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  // MATCHBOOK USE
  // -------------------------------------------------------------
  useMatchbook() {
    if (this.matchActive) {
      this.interact.dialogueLine = {
        text:
          "The match is already burning, shadows shifting across the room."
      };
      this.interact.state = "dialogue";
      return;
    }

    this.matchActive = true;
    this.frameIndex = 0;
    this.frameTimer = 0;

    this.whiteFlash = true;
    this.whiteFlashTimer = 0;

    if (this.strikeSound) {
      try {
        this.strikeSound.currentTime = 0;
        this.strikeSound.play();
      } catch (e) {
        // ignore playback errors
      }
    }

    this.interact.dialogueLine = {
      text: "You strike a match. Light stutters across the room."
    };

    this.interact.state = "dialogue";

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------------------
  resetLighting() {
    this.matchActive = false;
    this.frameIndex = 0;
    this.whiteFlash = false;
    this.whiteFlashTimer = 0;
    this.bg.src = "assets/apartment_interior.png";
  }

  // -------------------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 500);
    }

    if (this.whiteFlash) {
      this.whiteFlashTimer += dt;
      if (this.whiteFlashTimer >= this.whiteFlashDuration) {
        this.whiteFlash = false;
      }
      return;
    }

    if (this.matchActive) {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameRate) {
        this.frameTimer = 0;
        this.frameIndex =
          (this.frameIndex + 1) % this.frames.length;
      }
    }
  }

  // -------------------------------------------------------------
  render(ctx) {
    if (this.whiteFlash) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        0,
        ctx.canvas.width,
        ctx.canvas.height
      );
    }
    else if (this.matchActive) {
      const frame = this.frames[this.frameIndex];
      if (frame.complete && frame.naturalWidth > 0) {
        drawSceneImage(ctx, frame, ctx.canvas);
      } else {
        drawSceneImage(ctx, this.bg, ctx.canvas);
      }
    }
    else {
      drawSceneImage(ctx, this.bg, ctx.canvas);
    }

    super.render(ctx);
    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  handleInput(e) {
    if (super.handleInput(e)) return true;

    if (e.key.toLowerCase() === "escape") {
      this.resetLighting();
      this.manager.set(
        new ApartmentHallwayScene(this.manager)
      );
      return true;
    }

    return false;
  }
}
