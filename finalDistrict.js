// ---------- finalDistrict.js ----------
// Final District — Sewer Entrance → Sewer Interior
// ENTERING THE SEWER IS A POINT OF NO RETURN
//
// Flow:
// Downtown → FinalDistrictScene
//   → Confirm descent
//     → SewerMazeOverlay (3-stage fog puzzle)
//       → onFinalMazeComplete()
//         → BunkerDoorScene
//
// Notes:
// - ESC is disabled once inside the sewer
// - Phase 5 is marked READY upon maze completion
// - Overlay handles puzzle logic; scene handles consequences

import { drawSceneImage, fadeOverlay } from "./renderUtils.js";

export class FinalDistrictScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;

    this.canShowKeyBar = false;

    // -------------------------------------------------
    // Scene state
    // entrance → sewerConfirm → sewer
    // -------------------------------------------------
    this.state = "entrance";

    // -------------------------------------------------
    // Images
    // -------------------------------------------------
    this.entranceBg = new Image();
    this.entranceBg.src = "assets/sewer_lid.png";

    this.sewerBg = new Image();
    this.sewerBg.src = "assets/sewer.png";

    this.sewerBgNoReturn = new Image();
    this.sewerBgNoReturn.src = "assets/sewer_noreturn.png";

    this.useNoReturnBg = false;
  }

  // -------------------------------------------------
  init() {
    this.fade = 1;
    this.state = "entrance";
  }

  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 400);
    }
  }

  // -------------------------------------------------
  render(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (this.state === "entrance") {
      drawSceneImage(ctx, this.entranceBg, ctx.canvas);
      this.renderEntranceText(ctx, W, H);
    }

    if (this.state === "sewerConfirm") {
      drawSceneImage(ctx, this.entranceBg, ctx.canvas);
      this.renderConfirmText(ctx, W, H);
    }

    if (this.state === "sewer") {
      const bg = this.useNoReturnBg && this.sewerBgNoReturn.complete && this.sewerBgNoReturn.naturalWidth > 0
        ? this.sewerBgNoReturn
        : this.sewerBg;
      drawSceneImage(ctx, bg, ctx.canvas);
      this.renderSewerText(ctx, W, H);
    }

    fadeOverlay(ctx, this.fade);
  }

  // -------------------------------------------------
  // TEXT RENDERING
  // -------------------------------------------------
  renderEntranceText(ctx, W, H) {
    ctx.font = '32px "Pixel-Regular", monospace';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";

    ctx.fillText(
      "A rusted sewer lid sits slightly ajar.",
      W / 2,
      H - 140
    );

    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.fillStyle = "#aaa";
    ctx.fillText("ENTER  Descend     ESC  Step back", W / 2, H - 90);
  }

  renderConfirmText(ctx, W, H) {
    ctx.font = '28px "Pixel-Regular", monospace';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";

    const lines = [
      "Once you go down there,",
      "there may be no way back.",
      "",
      "ENTER  Continue",
      "ESC    Turn back"
    ];

    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H / 2 - 120 + i * 36);
    });
  }

  renderSewerText(ctx, W, H) {
    ctx.font = '28px "Pixel-Regular", monospace';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";

    const lines = [
      "The lid slams shut behind you.",
      "",
      "The air is damp. Water drips somewhere in the dark.",
      ""
    ];

    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H - 260 + i * 36);
    });

    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.fillStyle = "#777";
    ctx.fillText("No signal. No way back.", W / 2, H - 90);
  }

  // -------------------------------------------------
  // INPUT
  // -------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // -------------------------------------------------
    // ENTRANCE
    // -------------------------------------------------
    if (this.state === "entrance") {
      if (key === "enter") {
        this.state = "sewerConfirm";
        this.fade = 1;
        return;
      }

      if (key === "escape") {
        return;
      }
    }

    // -------------------------------------------------
    // CONFIRMATION
    // -------------------------------------------------
    if (this.state === "sewerConfirm") {
      if (key === "enter") {
        this.state = "sewer";
        this.useNoReturnBg = true;
        this.fade = 1;

        // 🔒 POINT OF NO RETURN
        localStorage.setItem("finalDistrictEntered", "true");

        // 🚨 Launch final sewer maze overlay
        this.manager.overlay.show("SewerMaze");
        return;
      }

      if (key === "escape") {
        this.state = "entrance";
        this.fade = 1;
        return;
      }
    }

    // -------------------------------------------------
    // SEWER — NO ESCAPE
    // -------------------------------------------------
    if (this.state === "sewer") {
      return;
    }
  }

  // -------------------------------------------------
  // FINAL MAZE CALLBACK (called by SewerMazeOverlay)
  // -------------------------------------------------
  onFinalMazeComplete() {
    // Prepare final phone phase (Phase 5)
    localStorage.setItem("phase5_ready", "true");
    window.dispatchEvent(new Event("phoneUpdate"));

    // Transition to bunker door
    import("./bunkerDoor.js").then(({ BunkerDoorScene }) => {
      this.manager.set(new BunkerDoorScene(this.manager));
    });
  }
}
