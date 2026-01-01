// ---------- controlRoom.js ----------
// Observatory Control Room
// Crystal → Analyzer → Star Chart puzzle activation
// MECHANICS ONLY VERSION
// EXIT + ESC return to Control Room Door

import { BaseInteractiveScene } from "./BaseInteractiveScene.js";
import { drawSceneImage, fadeOverlay } from "./renderUtils.js";
import { ObservatoryControlDoorScene } from "./observatoryControlDoor.js";

export class ControlRoomScene extends BaseInteractiveScene {
  constructor(manager) {
    super(manager);

    this.sceneType = "interactive";
    this.canMove = false;

    this.fade = 1;

    // -------------------------------------------------
    // Persistent state
    // -------------------------------------------------
    this.hasCrystal =
      localStorage.getItem("inventory_crystal") === "true";

    this.crystalPlaced =
      localStorage.getItem("controlRoom_crystalPlaced") === "true";

    this.starChartActive =
      localStorage.getItem("controlRoom_starChartActive") === "true";

    this.starChartSolved =
      localStorage.getItem("starChartSolved") === "true";

    // -------------------------------------------------
    // Background
    // -------------------------------------------------
    this.bg = new Image();
    this.bg.src = "assets/observatory_controlroom.png";

    // -------------------------------------------------
    // One-time entry hint
    // -------------------------------------------------
    this.entryHintShown =
      localStorage.getItem("controlRoom_entryHint") === "true";

    // -------------------------------------------------
    // Bind once
    // -------------------------------------------------
    this.onStarChartPuzzleComplete =
      this.onStarChartPuzzleComplete.bind(this);

    // -------------------------------------------------
    // Objects
    // -------------------------------------------------
    this.objects = this.buildObjects();
  }

  // -------------------------------------------------
  init() {
    this.fade = 1;

    window.addEventListener(
      "starChartPuzzleComplete",
      this.onStarChartPuzzleComplete
    );

    // Entry hint
    if (this.hasCrystal && !this.crystalPlaced && !this.entryHintShown) {
      this.entryHintShown = true;
      localStorage.setItem("controlRoom_entryHint", "true");

      this.interact.dialogueLine = {
        text:
          "The crystal hums softly.\n" +
          "Its glow intensifies as you step inside the control room."
      };
      this.interact.state = "dialogue";
    }
  }

  destroy() {
    window.removeEventListener(
      "starChartPuzzleComplete",
      this.onStarChartPuzzleComplete
    );
  }

  // -------------------------------------------------
  // ESC SUPPORT — SAME AS EXIT
  // -------------------------------------------------
  handleInput(e) {
    if (e.key.toLowerCase() === "escape") {
      this.manager.set(
        new ObservatoryControlDoorScene(this.manager)
      );
      return true;
    }

    // Fallback to base scene handling
    return super.handleInput(e);
  }

  // -------------------------------------------------
  getActiveObjects() {
    return this.objects;
  }

  // -------------------------------------------------
  buildObjects() {
    const list = [];

    list.push({
      name: "Control Panel",
      desc: "A dense array of switches and readouts.",
      look: () =>
        "Most of the systems appear to be in standby mode."
    });

    list.push({
      name: "Crystalline Analyzer",
      desc: this.crystalPlaced
        ? "The analyzer pulses with internal light."
        : "A recessed chamber shaped to hold something crystalline.",
      use: () => this.useAnalyzer()
    });

    list.push({
      name: "Star Monitor",
      desc: this.starChartSolved
        ? "The constellations are locked into a stable configuration."
        : this.starChartActive
          ? "The display scrolls through unfamiliar constellations."
          : "A darkened display. It doesn’t respond.",
      use: () => this.useStarChart()
    });

    // EXIT → Control Room Door
    list.push({
      name: "Exit",
      desc: "Step back toward the control room door.",
      use: () => {
        this.manager.set(
          new ObservatoryControlDoorScene(this.manager)
        );
      }
    });

    return list;
  }

  // -------------------------------------------------
  useAnalyzer() {
    if (this.crystalPlaced) {
      this.interact.dialogueLine = {
        text:
          "The crystal is already seated.\n" +
          "Energy flows steadily through the analyzer."
      };
      this.interact.state = "dialogue";
      return;
    }

    if (!this.hasCrystal) {
      this.interact.dialogueLine = {
        text:
          "The analyzer remains inert.\n" +
          "It seems to be missing a key component."
      };
      this.interact.state = "dialogue";
      return;
    }

    this.hasCrystal = false;
    this.crystalPlaced = true;
    this.starChartActive = true;

    localStorage.removeItem("inventory_crystal");
    localStorage.setItem("controlRoom_crystalPlaced", "true");
    localStorage.setItem("controlRoom_starChartActive", "true");
    localStorage.setItem("starChartEnabled", "true");

    window.dispatchEvent(
      new CustomEvent("inventoryUpdate", {
        detail: { remove: "Crystal" }
      })
    );

    this.interact.dialogueLine = {
      text:
        "You place the crystal into the analyzer.\n\n" +
        "It locks into place and begins to glow.\n" +
        "The star monitor flickers to life."
    };
    this.interact.state = "dialogue";

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------
  useStarChart() {
    if (!this.starChartActive) {
      this.interact.dialogueLine = {
        text:
          "The display flickers briefly, then goes dark.\n" +
          "Something is preventing it from activating."
      };
      this.interact.state = "dialogue";
      return;
    }

    if (this.starChartSolved) {
      this.interact.dialogueLine = {
        text:
          "The star chart remains fixed.\n" +
          "Whatever it revealed has already been unlocked."
      };
      this.interact.state = "dialogue";
      return;
    }

    this.manager.overlay.show("StarChartPuzzle");
  }

  // -------------------------------------------------
  // PUZZLE COMPLETION (MECHANICS ONLY)
  // -------------------------------------------------
  onStarChartPuzzleComplete() {
    if (this.starChartSolved) return;

    this.starChartSolved = true;
    localStorage.setItem("starChartSolved", "true");

    localStorage.setItem("phase5_ready", "true");
    window.dispatchEvent(new Event("phoneUpdate"));

    this.interact.dialogueLine = {
      text:
        "The final ring locks into place.\n\n" +
        "A low hum resonates through the control room."
    };
    this.interact.state = "dialogue";

    this.objects = this.buildObjects();
  }

  // -------------------------------------------------
  update(dt) {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt / 600);
    }
  }

  // -------------------------------------------------
  render(ctx) {
    drawSceneImage(ctx, this.bg, ctx.canvas);
    super.render(ctx);
    fadeOverlay(ctx, this.fade);
  }
}
