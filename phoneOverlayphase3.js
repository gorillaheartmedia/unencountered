// ---------- phoneOverlayphase3.js ----------
// Phase 3 ONLY — Mysterious Caller
// One-time incoming call ("???")
// After completion → unlocks Observatory + enables Phase 4
// Fully standardized to Phase 1 / Phase 2 overlay contract

import { getLayout } from './layout.js';
import { drawTextCentered, drawBox } from './ui.js';
import { PhoneAudio } from './phoneAudio.js';
import { PhaseManager } from './phaseManager.js';

export class PhoneOverlayPhase3 {
  constructor(manager) {
    this.name = "Phone"; // REQUIRED by OverlayManager
    this.manager = manager;
    this.phaseManager = new PhaseManager();

    // UI state
    this.mode = "calls"; // calls | conversation
    this.cursor = 0;
    this.dialogueIndex = 0;

    // Single incoming call
    this.calls = [
      {
        id: "mystery",
        name: "???",
        status: "Incoming call...",
        active: true
      }
    ];

    // Script
    this.mysteryScript = [
      ["???", "....."],
      ["Player", "Hello? Is someone there?"],
      ["Player", "Is this… is this Alex?"],
      ["???", "....."],
      ["Player", "Say something… please."],
      ["???", "…stay… out…"],
      ["Player", "Stay out? Out of what? Who IS this??"],
      ["???", "*click*"],
      ["Player", "…I should deliver this package to the Observatory."]
    ];
  }

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  init() {
    this.mode = "calls";
    this.cursor = 0;
    this.dialogueIndex = 0;

    // One-shot guard
    if (this.phaseManager.isCompleted("phase3")) {
      this.manager.overlay.hide();
      return;
    }

    this.phaseManager.startPhase("phase3");

    // Ring immediately
    window.dispatchEvent(new Event("phoneRingRequested"));
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);

    drawBox(ctx, x, y, w, h, "rgba(0,0,0,0.75)", "#fff");
    drawTextCentered(ctx, "PHONE", y + 50);

    if (this.mode === "calls") {
      this.renderCallList(ctx, x, y, w, h);
      return;
    }

    if (this.mode === "conversation") {
      this.renderConversation(ctx, x, y, w, h);
      return;
    }
  }

  renderCallList(ctx, x, y, w, h) {
    drawTextCentered(ctx, "CALLS", y + 120);

    const c = this.calls[0];
    const ly = y + 200;

    drawBox(
      ctx,
      x + w / 2 - 200,
      ly - 25,
      400,
      60,
      "rgba(255,255,255,0.15)",
      "#fff"
    );

    ctx.font = '24px "Pixel-Regular"';
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(c.name, x + w / 2, ly);

    ctx.font = '18px "Pixel-Regular"';
    ctx.fillStyle = "#aaa";
    ctx.fillText(c.status, x + w / 2, ly + 36);

    drawTextCentered(
      ctx,
      "Press ENTER to answer • ESC to ignore",
      y + h - 60,
      "#aaa",
      18
    );
  }

  renderConversation(ctx, x, y, w, h) {
    const entry = this.mysteryScript[this.dialogueIndex];
    if (!entry) return;

    const [speaker, text] = entry;

    drawBox(
      ctx,
      x + 60,
      y + 140,
      w - 120,
      260,
      "rgba(255,255,255,0.05)",
      "#aaa"
    );

    ctx.textAlign = "center";
    ctx.font = '20px "Pixel-Regular"';
    ctx.fillStyle = "#aaa";
    ctx.fillText(speaker, x + w / 2, y + 150);

    ctx.font = '24px "Pixel-Regular"';
    ctx.fillStyle = "#fff";

    const lines = this.wrapText(ctx, text, w * 0.75);
    let ly = y + 200;

    for (const line of lines) {
      ctx.fillText(line, x + w / 2, ly);
      ly += 32;
    }

    drawTextCentered(
      ctx,
      "Press ENTER • ESC to hang up",
      y + h - 60,
      "#aaa",
      18
    );
  }

  // -------------------------------------------------------------
  // INPUT
  // -------------------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // --- CALL LIST ---
    if (this.mode === "calls") {
      if (key === "enter") {
        PhoneAudio.stopRing();
        PhoneAudio.playAnswer();
        this.mode = "conversation";
        this.dialogueIndex = 0;
        return;
      }

      if (key === "escape") {
        this.exitPhase();
        return;
      }
    }

    // --- CONVERSATION ---
    if (this.mode === "conversation") {
      if (key === "enter") {
        this.dialogueIndex++;

        if (this.dialogueIndex >= this.mysteryScript.length) {
          this.exitPhase();
        }
        return;
      }

      if (key === "escape") {
        this.exitPhase();
        return;
      }
    }
  }

  // -------------------------------------------------------------
  // EXIT PHASE — SINGLE SOURCE OF TRUTH
  // -------------------------------------------------------------
  exitPhase() {
    PhoneAudio.stopRing();
    PhoneAudio.playHangup();

    // Story unlock happens ONLY here
    localStorage.setItem("observatoryVisitEnabled", "true");

    this.phaseManager.completePhase("phase3");

    // Notify main.js / overlay manager to refresh phone state
    window.dispatchEvent(new Event("phoneUpdate"));

    this.manager.overlay.hide();
  }

  // -------------------------------------------------------------
  // TEXT WRAP
  // -------------------------------------------------------------
  wrapText(ctx, text, maxWidth) {
    const words = String(text || "").split(" ");
    const lines = [];
    let current = "";

    for (const w of words) {
      const test = current ? current + " " + w : w;
      if (ctx.measureText(test).width > maxWidth) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
    return lines;
  }
}
