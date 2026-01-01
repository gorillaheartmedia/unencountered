import { PhoneAudio } from "./phoneAudio.js";

export class OverlayManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.overlays = new Map();
    this.active = null;

    // Message alert
    this.messageUnread = false;
    this.messageSound = new Audio("assets/sounds/message.wav");
    this.messageSound.preload = "auto";
    this.messageSound.volume = 0.8;

    // Call alert
    this.callUnread = false;
  }

  add(name, overlay) {
    this.overlays.set(name, overlay);
  }

  show(name) {
    const overlay = this.overlays.get(name);
    if (!overlay) return;

    // Close previous overlay cleanly
    if (this.active && this.active !== overlay) {
      this._closeActiveOverlay();
    }

    this.active = overlay;
    overlay.init?.();
  }

  hide() {
    this._closeActiveOverlay();
    this.active = null;
  }

  toggle(name) {
    if (this.active?.name === name) this.hide();
    else this.show(name);
  }

  update(dt) {
    this.active?.update?.(dt);
  }

  render(ctx) {
    if (this.active) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();

      this.active.render(ctx);
    }

    // Alerts always draw on top
    this.renderAlerts(ctx);
  }

  handleInput(e) {
    this.active?.handleInput?.(e);
  }

  close() {
    this.hide();
  }

  // ---------------------------------------------
  // 🔒 CENTRALIZED OVERLAY TEARDOWN
  // ---------------------------------------------
  _closeActiveOverlay() {
    if (!this.active) return;

    // Call overlay-specific cleanup
    if (typeof this.active.onClose === "function") {
      this.active.onClose();
    }

    // 🚨 HARD RULE:
    // If a Phone overlay closes, audio MUST stop.
    if (this.active.name === "Phone") {
      PhoneAudio.stopRing();
    }
  }

  // ---------------------------------------------
  // MESSAGE ALERT HELPERS
  // ---------------------------------------------
  notifyMessage() {
    this.messageUnread = true;
    if (this.messageSound) {
      this.messageSound.currentTime = 0;
      this.messageSound.play().catch(() => {});
    }
  }

  clearMessageAlert() {
    this.messageUnread = false;
  }

  notifyCall() {
    this.callUnread = true;
  }

  clearCallAlert() {
    this.callUnread = false;
  }

  renderAlerts(ctx) {
    const W = ctx.canvas.width;
    const padding = 14;
    const boxW = 280;
    const boxH = 56;
    let y = padding;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.font = '18px "Pixel-Regular", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.callUnread) {
      const x = W - boxW - padding;
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeRect(x, y, boxW, boxH);
      ctx.fillStyle = "#fff";
      ctx.fillText("New call. Press 1 to check.", x + boxW / 2, y + boxH / 2);
      y += boxH + 8;
    }

    if (this.messageUnread) {
      const x = W - boxW - padding;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeRect(x, y, boxW, boxH);
      ctx.fillStyle = "#fff";
      ctx.fillText("New message. Press 2 to check.", x + boxW / 2, y + boxH / 2);
    }

    ctx.restore();
  }
}
