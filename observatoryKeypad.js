// ---------- observatoryKeypad.js ----------
// Keypad puzzle for the Control Room — QWERTY-style typed password.
// UPDATED:
// - Plays success / failure sounds
// - Cleanly returns to control door
// - Fully self-contained

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";

export class ObservatoryKeypadScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = false;

    this.bg = new Image();
    this.bg.src = "assets/observatory_keypad.png";

    this.inputBuffer = "";
    this.maxLength = 12;
    this.errorMessage = "";
    this.errorTimer = 0;

    // 🔐 Password
    this.PASSWORD = "ORION";

    // 🔊 Sounds
    this.soundSuccess = new Audio("assets/sounds/success.wav");
    this.soundFail = new Audio("assets/sounds/error.wav");

    this.soundSuccess.preload = "auto";
    this.soundFail.preload = "auto";
  }

  init() {
    this.fade = 1;
    this.inputBuffer = "";
    this.errorMessage = "";
    this.errorTimer = 0;

    this.soundSuccess.currentTime = 0;
    this.soundFail.currentTime = 0;
  }

  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 500);
    }

    if (this.errorTimer > 0) {
      this.errorTimer -= dt;
      if (this.errorTimer <= 0) {
        this.errorMessage = "";
      }
    }
  }

  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    drawSceneImage(ctx, this.bg, ctx.canvas);

    // Input field
    ctx.fillStyle = "rgba(214, 214, 214, 0.6)";
    ctx.fillRect(W / 2 - 220, H * 0.18, 440, 70);

    ctx.font = '32px "Pixel-Regular", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = "#dad7d7ff";
    ctx.fillText(this.inputBuffer, W / 2, H * 0.18 + 45);

    if (this.errorMessage) {
      ctx.font = '22px "Pixel-Regular", monospace';
      ctx.fillStyle = "#c5c5c5ff";
      ctx.fillText(this.errorMessage, W / 2, H * 0.18 + 90);
    }

    fadeOverlay(ctx, this.fade);
  }

  handleInput(e) {
    const key = e.key;

    if (key === "Escape" || key === "escape") {
      this.returnToDoor();
      return;
    }

    if (key === "Enter" || key === "enter") {
      this.submitPassword();
      return;
    }

    if (key === "Backspace" || key === "backspace") {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      return;
    }

    if (/^[a-zA-Z0-9]$/.test(key)) {
      if (this.inputBuffer.length < this.maxLength) {
        this.inputBuffer += key.toUpperCase();
      }
      return;
    }
  }

  submitPassword() {
    // Stop & rewind both sounds
    this.soundSuccess.pause();
    this.soundFail.pause();
    this.soundSuccess.currentTime = 0;
    this.soundFail.currentTime = 0;

    if (this.inputBuffer === this.PASSWORD) {
      localStorage.setItem("controlRoomUnlocked", "true");

      this.soundSuccess.play().catch(() => {});
      this.errorMessage = "ACCESS GRANTED";
      this.errorTimer = 1200;

      setTimeout(() => {
        this.returnToDoor();
      }, 1200);
    } else {
      this.soundFail.play().catch(() => {});
      this.errorMessage = "ACCESS DENIED";
      this.errorTimer = 1200;
      this.inputBuffer = "";
    }
  }

  returnToDoor() {
    import("./observatoryControlDoor.js").then(
      ({ ObservatoryControlDoorScene }) => {
        this.manager.set(new ObservatoryControlDoorScene(this.manager));
      }
    );
  }
}
