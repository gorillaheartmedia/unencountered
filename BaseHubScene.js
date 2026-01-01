// ---------- BaseHubScene.js ----------
// Base class for HUB scenes (Office, Apartment, etc.)
// - Allows hotkeys (1–4)
// - No verbs
// - No InteractionSystem
// - Draws keybar via main.js

export class BaseHubScene {
  constructor(manager) {
    this.manager = manager;

    // -----------------------------
    // SCENE IDENTITY
    // -----------------------------
    this.sceneType = "hub";          // ⛔ NOT interactive
    this.canShowKeyBar = true;       // ✅ THIS IS THE KEY FIX

    // -----------------------------
    // Hub scenes never move
    // -----------------------------
    this.canMove = false;
  }

  // Optional hooks (safe defaults)
  init() {}
  update() {}
  render() {}

  // Hub scenes DO NOT consume input
  handleInput() {
    return false;
  }
}
