// ---------- phoneOverlay.js ----------
// Unified Phone Overlay Router (Phase 1–4 SAFE)
// HARD RULE: Phase 2 cannot activate unless Phase 1 is completed.

import { PhoneOverlayPhase1 } from "./phoneOverlayphase1.js";
import { PhoneOverlayPhase2 } from "./phoneOverlayphase2.js";
import { PhoneOverlayPhase3 } from "./phoneOverlayphase3.js";
import { PhoneOverlayPhase4 } from "./phoneOverlayphase4.js";

export class PhoneOverlay {
  constructor(manager) {
    this.manager = manager;
    this.active = null;
    this.name = "Phone";
  }

  init() {
    this.selectPhase();
    this.active?.init?.();
  }

  refresh() {
    this.selectPhase();
    this.active?.init?.();
  }

  selectPhase() {
    const phase1Completed =
      localStorage.getItem("phase1_completed") === "true" ||
      localStorage.getItem("gordonFirstDone") === "true"; // legacy support

    // PHASE 4 (highest priority)
    if (localStorage.getItem("phase4_ready") === "true") {
      this.active = new PhoneOverlayPhase4(this.manager);
      return;
    }

    // PHASE 3
    if (localStorage.getItem("phase3_ready") === "true") {
      this.active = new PhoneOverlayPhase3(this.manager);
      return;
    }

    // PHASE 1 MUST run until completed
    if (!phase1Completed) {
      this.active = new PhoneOverlayPhase1(this.manager);
      return;
    }

    // PHASE 2 only after Phase 1 is completed
    if (
      localStorage.getItem("inventory_keycard") === "true" ||
      localStorage.getItem("inventory_observatoryPackage") === "true"
    ) {
      this.active = new PhoneOverlayPhase2(this.manager);
      return;
    }

    // Default fallback: Phase 1 (safe)
    this.active = new PhoneOverlayPhase1(this.manager);
  }

  handleInput(e) {
    return this.active?.handleInput?.(e);
  }

  update(dt) {
    this.active?.update?.(dt);
  }

  render(ctx) {
    this.active?.render?.(ctx);
  }
}
