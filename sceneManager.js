// ---------- sceneManager.js ----------
// Central scene router + centralized input ownership
// FIXED: cinematic scenes (canShowKeyBar === false) cannot open overlays/hotkeys
// FIXED: supports hotkeys 1–4 consistently, but ONLY in gameplay scenes

export class SceneManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.scene = null;

    // Injected elsewhere
    this.overlay = null; // OverlayManager
  }

  set(scene) {
    this.scene = scene;
    this.scene?.init?.();
  }

  update(dt) {
    this.scene?.update?.(dt);
    this.overlay?.update?.(dt);
  }

  render() {
    if (!this.scene) return;

    this.scene.render?.(this.ctx);

    // Overlay draws on top
    this.overlay?.render?.(this.ctx);
  }

  // -------------------------------------------------
  // 🔒 CENTRALIZED INPUT OWNERSHIP
  // -------------------------------------------------
  handleInput(e) {
    const key = (e.key || "").toLowerCase();

    // If overlay is active, it owns input. Scene gets NOTHING.
    if (this.overlay?.active) {
      this.overlay.handleInput(e);
      return true;
    }

    const scene = this.scene;

    // 🚫 CINEMATIC SCENES: NO HOTKEYS, NO OVERLAYS
    // TitleScene sets canShowKeyBar = false
    if (scene?.canShowKeyBar === false) {
      return !!scene?.handleInput?.(e);
    }

    // Debounce: if something else set suppressEnter (used in office.js)
    if (window.suppressEnter && key === "enter") return true;

    // -------------------------------------------------
    // Global overlay hotkeys (GAMEPLAY ONLY)
    // -------------------------------------------------
    if (key === "1") {
      this.overlay?.toggle?.("Phone");
      return true;
    }

    if (key === "2") {
      this.overlay?.toggle?.("Notebook");
      return true;
    }

    if (key === "3") {
      this.overlay?.toggle?.("Location");
      return true;
    }

    if (key === "4") {
      this.overlay?.toggle?.("Inventory");
      return true;
    }

    // Otherwise, normal scene input
    return !!scene?.handleInput?.(e);
  }
}
