// ---------- finalInterior.js ----------
// FINAL CINEMATIC — Secret Bunker
// No return. No escape. Truth contained.

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { InteractionSystem } from "./interactionSystem.js";

export class FinalInteriorScene {
  constructor(manager) {
    this.manager = manager;
    this.sceneType = "cinematic";

    // -------------------------------------------------
    // HARD LOCKS
    // -------------------------------------------------
    this.canMove = false;
    this.canShowKeyBar = false;

    // -------------------------------------------------
    // Visual state
    // -------------------------------------------------
    this.fade = 1;
    this.blackout = false;
    this.bgStage = "none"; // none | main | ufo | body
    this.overlayFadeDuration = 4000; // ms, matched to music fade

    // -------------------------------------------------
    // DOOR ANIMATION
    // -------------------------------------------------
    this.doorFrames = [];
    this.doorFrameIndex = 0;
    this.doorFrameTimer = 0;
    this.doorFrameDuration = 70; // ms per frame
    this.doorHoldTimer = 0;
    this.doorHoldDuration = 2500;
    this.doorSequenceDone = false;

    this.doorElapsedTime = 0;
    this.doorSfxPlayed = false;
    this.doorSfxTriggerTime = 1000; // ms

    // -------------------------------------------------
    // Background layers (revealed later)
    // -------------------------------------------------
    this.bg = new Image();
    this.bg.src = "assets/bunker_main.png";

    this.ufo = new Image();
    this.ufo.src = "assets/bunker_ufo.png";

    this.body = new Image();
    this.body.src = "assets/bunker_alien.png";

    // Forest flashback layers
    this.forestBase = new Image();
    this.forestBase.src = "assets/forest.png";

    this.comet = new Image();
    this.comet.src = "assets/comet.png";

    this.forestFrames = [];
    this.forestFrameIndex = 0;
    this.forestFrameTimer = 0;
    this.forestFrameDuration = 80; // ms per frame
    this.forestAnimHoldTimer = 0;
    this.forestAnimHoldDuration = 800; // ms before starting the loop

    // -------------------------------------------------
    // Audio
    // -------------------------------------------------
    this.doorSfx = new Audio("assets/sounds/door_unlock.wav");
    this.doorSfx.preload = "auto";

    this.music = new Audio("assets/sounds/final_theme.wav");
    this.music.loop = true;
    this.music.preload = "auto";
    this.musicFadeDuration = 4000; // ms
    this.musicFadeTarget = 0.8;
    this.musicFadeElapsed = 0;
    this.musicFadingIn = false;

    // -------------------------------------------------
    // Interaction (dialogue only)
    // -------------------------------------------------
    this.interact = new InteractionSystem(this);
    this.interact.verbs = [];

    this.dialogueQueue = null;
    this.dialogueCallback = null;
    this.finished = false;

    this.doorSequenceActive = false;
  }

  // -------------------------------------------------
  init() {
    this.fade = 0;
    this.blackout = false;
    this.bgStage = "ufo";
    this.interact.state = "dialogue";
    this.doorSequenceDone = true;
    this.doorSequenceActive = false;

    this.loadDoorFrames();
    this.loadForestFrames();

    // Start immediately on the UFO backdrop
    this.startCinematic();
  }

  // -------------------------------------------------
  // HARD BLOCK ESC
  // -------------------------------------------------
  handleInput(e) {
    // Let the dialogue system consume input first
    if (this.interact.handleInput?.(e)) {
      return true;
    }

    if (e.key.toLowerCase() === "escape") {
      this.interact.dialogueLine = {
        text: "There is no way back."
      };
      this.interact.state = "dialogue";
      return true;
    }
    return false;
  }

  // -------------------------------------------------
  // LOAD DOOR SEQUENCE
  // -------------------------------------------------
  loadDoorFrames() {
    for (let i = 0; i < 24; i++) {
      const img = new Image();
      img.src = `assets/door/door${String(i).padStart(4, "0")}.png`;
      this.doorFrames.push(img);
    }
  }

  loadForestFrames() {
    // Use the requested 0-23 set
    for (let i = 0; i <= 23; i++) {
      const img = new Image();
      img.src = `assets/forest/forest${String(i).padStart(4, "0")}.png`;
      this.forestFrames.push(img);
    }
  }

  // -------------------------------------------------
  update(dt) {
    // -----------------------------
    // DOOR ANIMATION SEQUENCE (only when active)
    // -----------------------------
    if (this.doorSequenceActive && !this.doorSequenceDone) {
      this.doorElapsedTime += dt;
      this.doorFrameTimer += dt;

      // 🔊 Door slam SFX (~1s in)
      if (
        !this.doorSfxPlayed &&
        this.doorElapsedTime >= this.doorSfxTriggerTime
      ) {
        this.playDoorSfx();
        this.doorSfxPlayed = true;
      }

      if (this.doorFrameIndex < this.doorFrames.length - 1) {
        if (this.doorFrameTimer >= this.doorFrameDuration) {
          this.doorFrameTimer = 0;
          this.doorFrameIndex++;
        }
      } else {
        this.doorHoldTimer += dt;

        if (this.doorHoldTimer >= this.doorHoldDuration) {
          this.doorSequenceDone = true;
          this.doorSequenceActive = false;
          this.onDoorSequenceComplete();
        }
      }
      return;
    }

    // -----------------------------
    // FADE CONTROL
    // -----------------------------
    this.fade = 0;

    // -----------------------------
    // MUSIC FADE-IN
    // -----------------------------
    if (this.musicFadingIn && this.music) {
      this.musicFadeElapsed += dt;
      const t = Math.min(1, this.musicFadeElapsed / this.musicFadeDuration);
      this.music.volume = Math.min(
        this.musicFadeTarget,
        this.musicFadeTarget * t
      );
      if (t >= 1) {
        this.musicFadingIn = false;
      }
    }

    // -----------------------------
    // FOREST ANIMATION
    // -----------------------------
    if (this.bgStage === "forestStatic") {
      this.forestAnimHoldTimer += dt;
      if (this.forestAnimHoldTimer >= this.forestAnimHoldDuration) {
        this.bgStage = "forestAnim";
      }
    }

    if (this.bgStage === "forestAnim" && this.forestFrames.length) {
      this.forestFrameTimer += dt;
      if (this.forestFrameTimer >= this.forestFrameDuration) {
        this.forestFrameTimer = 0;
        this.forestFrameIndex =
          (this.forestFrameIndex + 1) % this.forestFrames.length;
      }
    }
  }

  // -------------------------------------------------
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // DOOR SEQUENCE
    if (this.doorSequenceActive && !this.doorSequenceDone) {
      const frame = this.doorFrames[this.doorFrameIndex];
      if (frame?.complete) {
        drawSceneImage(ctx, frame, ctx.canvas);
      }
      ctx.font = '26px "Pixel-Regular", monospace';
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("The lock engages behind you.", W / 2, H * 0.78);
      return;
    }

    // Background selection
    if (this.bgStage === "body" && this.body.complete) {
      drawSceneImage(ctx, this.body, ctx.canvas);
    } else if (
      (this.bgStage === "forestStatic" || this.bgStage === "forestAnim") &&
      this.forestBase.complete
    ) {
      drawSceneImage(ctx, this.forestBase, ctx.canvas);
      const frame = this.forestFrames[this.forestFrameIndex];
      if (this.bgStage === "forestAnim" && frame?.complete) {
        drawSceneImage(ctx, frame, ctx.canvas);
      }
      if (this.comet.complete) {
        drawSceneImage(ctx, this.comet, ctx.canvas);
      }
    } else {
      drawSceneImage(ctx, this.ufo, ctx.canvas);
    }

    this.interact.render(ctx, []);
    if (this.finished) {
      ctx.font = '32px "Pixel-Regular", monospace';
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("The End", W / 2, H * 0.28);
    }
  }

  // -------------------------------------------------
  // CINEMATIC FLOW
  // -------------------------------------------------
  startCinematic() {
    this.bgStage = "ufo";

    this.queueDialogue(
      [
        "The chamber opens around you.",
        "",
        "A vessel hangs in the dark.",
        "Not debris.",
        "A craft.",
        "",
        "Its hull is scorched—sealed shut.",
        "",
        "Silence presses in."
      ],
      () => this.revealBody()
    );
  }

  revealBody() {
    this.bgStage = "body";

    this.queueDialogue(
      [
        "Nearby, a steel table.",
        "",
        "Something lies strapped to it.",
        "",
        "Thin.",
        "Grey.",
        "",
        "Unmistakably not human."
      ],
      () => this.flashback()
    );
  }

  flashback() {
    // Forest flashback: base + comet, then animated loop
    this.bgStage = "forestStatic";
    this.blackout = false;
    this.fade = 0;
    this.forestFrameIndex = 0;
    this.forestFrameTimer = 0;
    this.forestAnimHoldTimer = 0;

    this.queueDialogue(
      [
        "Your mind drifts.",
        "",
        "Back to the campsite.",
        "",
        "A fire crackling.",
        "The woods silent.",
        "",
        "A sudden light in the sky.",
        "",
        "Something falling.",
        "",
        "You remember watching it burn through the clouds.",
        "",
        "And telling yourself it wasn’t real."
      ],
      () => this.startDoorSequence()
    );
  }

  gordonTruth() {
    // Return to bunker visuals after the flashback
    this.bgStage = "ufo";

    this.queueDialogue(
      [
        "????: “I told you not to come this far.”",
        "You: “Wait... That voice... I know that voice in the dark.”",
        "It's, It's, G.O.R.D.O.N.",
        "Gordon: “Alex didn’t know when to stop.”",
        "Gordon: “So I removed him.”",
        "Gordon: “Turned everyone against you. Against Alex.”",
        "Gordon: “But even when they thought you’d gone insane…”",
        "",
        "Gordon: “You kept digging.”"
      ],
      () => this.containment()
    );
  }

  containment() {
    this.queueDialogue(
      [

        "You: “Gordon.... How... How could you... I've known you since high school.”",

        "You: “And now… here you are. In on this... This conspiracy... This coverup..”",

        "Gordon: “”",

        "Gordon: “You never knew I was a government agent all this time. That's EXACTLY the point.",
        "Gordon: “And now. I have to make sure that people never know the truth.”",
        "Gordon: “Just Like what I did to Alex.”",
        "Gordon: “I am going to do to you now.",
        "Gordon: “Some encounters never happened.”",
      ],
      () => this.endScene()
    );
  }

  endScene() {
    this.finished = true;
    localStorage.setItem("gameCompleted", "true");
    this.stopMusic();
  }

  startDoorSequence() {
    this.bgStage = "door";
    this.doorSequenceActive = true;
    this.doorSequenceDone = false;
    this.doorElapsedTime = 0;
    this.doorFrameTimer = 0;
    this.doorHoldTimer = 0;
    this.doorSfxPlayed = false;
    this.doorFrameIndex = 0;
  }

  onDoorSequenceComplete() {
    this.gordonTruth();
  }

  // -------------------------------------------------
  // DIALOGUE QUEUE (ENGINE-CONSISTENT)
  // -------------------------------------------------
  queueDialogue(lines, callback) {
    this.dialogueQueue = [...lines];
    this.dialogueCallback = callback || null;

    const originalHandler =
      this.interact.handleInput.bind(this.interact);

    this.interact.dialogueLine = {
      text: this.dialogueQueue.shift()
    };
    this.interact.state = "dialogue";

    this.interact.handleInput = (e) => {
      const key = e.key.toLowerCase();

      if (key === "enter" || key === "escape") {
        if (this.dialogueQueue.length > 0) {
          this.interact.dialogueLine = {
            text: this.dialogueQueue.shift()
          };
          return true;
        }

        this.finishDialogue(originalHandler);
        return true;
      }
      return false;
    };
  }

  finishDialogue(originalHandler) {
    this.interact.dialogueLine = null;
    this.interact.state = "dialogue";
    this.interact.handleInput = originalHandler;

    if (this.dialogueCallback) {
      const cb = this.dialogueCallback;
      this.dialogueCallback = null;
      cb();
    }
  }

  // -------------------------------------------------
  // AUDIO HOOKS
  // -------------------------------------------------
  playDoorSfx() {
    if (!this.doorSfx) return;
    this.doorSfx.currentTime = 0;
    this.doorSfx.play().catch(() => {});
  }

  startMusic() {
    if (!this.music) return;
    this.music.volume = 0;
    this.music.currentTime = 0;
    this.music.play().catch(() => {});
    this.musicFadeElapsed = 0;
    this.musicFadingIn = true;
  }

  stopMusic() {
    if (!this.music) return;
    this.music.pause();
    this.music.currentTime = 0;
    this.music.volume = 0;
    this.musicFadingIn = false;
  }
}
