// ---------- phoneOverlayphase4.js ----------
// Police Detective Call — Phase 4
// Triggered after taking Alex’s notes
// One-shot phone call, clean exit, Phase 1–2 compliant

import { getLayout } from './layout.js';
import { drawTextCentered, drawBox } from './ui.js';
import { PhoneAudio } from './phoneAudio.js';
import { PhaseManager } from './phaseManager.js';

export class PhoneOverlayPhase4 {
  constructor(manager) {
    this.name = "Phone"; // ✅ MUST be "Phone"
    this.manager = manager;
    this.phaseManager = new PhaseManager();

    this.mode = "calls"; // calls | conversation
    this.cursor = 0;
    this.dialogueIndex = 0;

    this.calls = [
      {
        id: "detective",
        name: "Unknown Number",
        status: "Incoming call...",
        active: true
      }
    ];

    this.script = [
      ["Player", "Look, stop calling this number."],
      ["Detective", "This is Detective Harris with the city police."],
      ["Detective", "I’m calling regarding the disappearance of Alex Roth."],
      ["Player", "…"],
      ["Detective", "We’ve received reports placing you at Mr. Roth’s apartment building earlier this week."],
      ["Detective", "Witnesses also recall seeing you at his workplace."],
      ["Detective", "And more recently, near a campsite where Mr. Roth was last believed to be headed."],
      ["Player", "You’ve got the wrong idea."],
      ["Detective", "That may be."],
      ["Detective", "But several of your associates describe you as having taken an unusual interest in Mr. Roth."],
      ["Detective", "Late hours. Questions. Curiosity."],
      ["Player", "Am I being accused of something?"],
      ["Detective", "Not at this time."],
      ["Detective", "But you are a key person of interest in our investigation."],
      ["Detective", "If you have any items belonging to Mr. Roth…"],
      ["Detective", "I suggest you consider how that might look."],
      ["Detective", "We’ll be in touch."],
      ["Detective", "Don’t leave town."]
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
    if (this.phaseManager.isCompleted("phase4")) {
      this.manager.overlay.hide();
      return;
    }

    this.phaseManager.startPhase("phase4");

    // 🔔 Ring immediately
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
    } else {
      this.renderConversation(ctx, x, y, w, h);
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

    ctx.font = '24px "Pixel-Regular", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(c.name, x + w / 2, ly);

    ctx.font = '18px "Pixel-Regular"';
    ctx.fillStyle = "#aaa";
    ctx.fillText(c.status, x + w / 2, ly + 40);

    drawTextCentered(
      ctx,
      "Press ENTER to answer • ESC to ignore",
      y + h - 60,
      "#aaa",
      18
    );
  }

  renderConversation(ctx, x, y, w, h) {
    const entry = this.script[this.dialogueIndex];
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

        if (this.dialogueIndex >= this.script.length) {
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
  // EXIT PHASE (CORRECT & SAFE)
  // -------------------------------------------------------------
  exitPhase() {
    PhoneAudio.stopRing();
    PhoneAudio.playHangup();

    this.phaseManager.completePhase("phase4");

    // Let main.js re-evaluate the Phone overlay
    window.dispatchEvent(new Event("phoneUpdate"));

    this.manager.overlay.hide();
  }

  // -------------------------------------------------------------
  // TEXT WRAP
  // -------------------------------------------------------------
  wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let current = "";

    for (const w of words) {
      const test = current ? current + " " + w : w;
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
    return lines;
  }
}
