// ---------- office.js ----------
// Office Hub Scene
// - HUB scene (hotkeys 1–4 allowed)
// - NO verbs
// - NO InteractionSystem
// - Dialogue + phone logic only

import { BaseHubScene } from "./BaseHubScene.js";
import { drawSceneImage, fadeOverlay } from "./renderUtils.js";

export class OfficeScene extends BaseHubScene {
  constructor(manager) {
    super(manager);

    // -----------------------------
    // Visuals
    // -----------------------------
    this.fade = 1;

    this.bg = new Image();
    this.bg.src = "assets/office.png";

    // Fan animation
    this.fans = [new Image(), new Image(), new Image()];
    this.fans[0].src = "assets/fan_0.png";
    this.fans[1].src = "assets/fan_1.png";
    this.fans[2].src = "assets/fan_2.png";
    this.fanIndex = 0;
    this.fanTimer = 0;

    // -----------------------------
    // Dialogue (hub-style)
    // -----------------------------
    this.dialogueLine = null;

    // -----------------------------
    // Phase state
    // -----------------------------
    this.phase3Ready = false;
    this.phase3Started = false;
    this.phase4Ready = false;
    this.phase1Prompted = false;

    // -----------------------------
    // Phone ringing
    // -----------------------------
    this.ringSound = new Audio("assets/sounds/phone_ring.mp3");
    this.ringPlayed = false;
    this.awaitingPhoneOpen = false;
  }

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  init() {
    this.fade = 1;
    this.dialogueLine = null;
    this.ringPlayed = false;
    this.awaitingPhoneOpen = false;

    window.suppressEnter = false;

    this.phase3Ready = localStorage.getItem("phase3_ready") === "true";
    this.phase3Started = localStorage.getItem("phase3_started") === "true";
    this.phase4Ready = localStorage.getItem("phase4_ready") === "true";

    // -------------------------------------------------------------
    // PHASE 4
    // -------------------------------------------------------------
    if (this.phase4Ready) {
      this.startRinging(
        "My phone’s ringing again…",
        "phase4"
      );
      return;
    }

    // -------------------------------------------------------------
    // PHASE 3
    // -------------------------------------------------------------
    if (this.phase3Ready && !this.phase3Started) {
      this.startRinging(
        "The phone’s ringing… I wasn’t expecting a call.",
        "phase3"
      );
      return;
    }

  }

  // -------------------------------------------------------------
  // PHONE CONTROL
  // -------------------------------------------------------------
  startRinging(text, phase) {
    if (!this.ringPlayed) {
      this.ringPlayed = true;
      this.ringSound.loop = true;
      this.ringSound.volume = 0.9;
      this.ringSound.play().catch(() => {});
    }

    this.dialogueLine = { text };
    this.awaitingPhoneOpen = phase;
  }

  stopRinging() {
    this.ringSound.pause();
    this.ringSound.currentTime = 0;
  }

  // -------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------
  update(dt) {
    // Fan animation
    this.fanTimer += dt;
    if (this.fanTimer > 150) {
      this.fanTimer = 0;
      this.fanIndex = (this.fanIndex + 1) % this.fans.length;
    }

    // Fade-in
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

    // Background
    drawSceneImage(ctx, this.bg, ctx.canvas);

    // Fan
    const fan = this.fans[this.fanIndex];
    if (fan.complete) {
      const size = Math.min(W, H) * 0.45;
      ctx.drawImage(fan, (W - size) / 2, H * 0.04, size, size);
    }

    // -------------------------------------------------------------
    // HUB DIALOGUE BOX (full-width, not skinny)
    // -------------------------------------------------------------
    if (this.dialogueLine) {
      const boxW = W * 0.8;
      const boxH = 90;
      const x = (W - boxW) / 2;
      const y = H - boxH - 40;

      // Box
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(x, y, boxW, boxH);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, boxW, boxH);

      // Text
      ctx.font = '20px "Pixel-Regular", monospace';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        this.dialogueLine.text,
        W / 2,
        y + boxH / 2 - 8
      );

      ctx.font = '14px "Pixel-Regular", monospace';
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(
        "Press ENTER",
        W / 2,
        y + boxH - 18
      );
    }

    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------------------
  // INPUT
  // -------------------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // Waiting for phone
    if (this.awaitingPhoneOpen) {
      if (key === "enter" || key === "1") {
        this.stopRinging();

        if (this.awaitingPhoneOpen === "phase3") {
          localStorage.setItem("phase3_started", "true");
        }

        this.awaitingPhoneOpen = false;
        this.dialogueLine = null;

        window.suppressEnter = true;
        this.manager.overlay.show("Phone");
        setTimeout(() => (window.suppressEnter = false), 80);
      }
      return true;
    }

    // Dismiss dialogue
    if (this.dialogueLine && key === "enter") {
      this.dialogueLine = null;
      return true;
    }

    // Let hotkeys (1–4) fall through to main.js
    return false;
  }
}
