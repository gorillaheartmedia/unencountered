// ---------- phaseManager.js ----------
// Centralized narrative phase control
// Enforces one-shot phases, priority, and clean transitions

export class PhaseManager {
  constructor() {
    this.PHASES = [
      "phase1",
      "phase2",
      "phase3",
      "phase4"
    ];
  }

  // -------------------------------------------------------------
  // GETTERS
  // -------------------------------------------------------------
  getCurrentPhase() {
    // Highest-priority active phase wins
    if (this.isReady("phase4")) return "phase4";
    if (this.isReady("phase3")) return "phase3";
    if (this.isReady("phase2")) return "phase2";
    return "phase1";
  }

  isReady(phase) {
    return localStorage.getItem(`${phase}_ready`) === "true";
  }

  isCompleted(phase) {
    return localStorage.getItem(`${phase}_completed`) === "true";
  }

  // -------------------------------------------------------------
  // PHASE CONTROL
  // -------------------------------------------------------------
  armPhase(phase) {
    if (this.isCompleted(phase)) return false;

    localStorage.setItem(`${phase}_ready`, "true");
    return true;
  }

  startPhase(phase) {
    if (this.isCompleted(phase)) return false;

    localStorage.setItem(`${phase}_started`, "true");
    return true;
  }

  completePhase(phase) {
    localStorage.removeItem(`${phase}_ready`);
    localStorage.removeItem(`${phase}_started`);
    localStorage.setItem(`${phase}_completed`, "true");
    return true;
  }

  // -------------------------------------------------------------
  // ONE-SHOT SAFETY
  // -------------------------------------------------------------
  runOnce(phase, fn) {
    if (this.isCompleted(phase)) return false;
    fn();
    return true;
  }

  // -------------------------------------------------------------
  // DEBUG / RESET (OPTIONAL)
  // -------------------------------------------------------------
  resetPhase(phase) {
    localStorage.removeItem(`${phase}_ready`);
    localStorage.removeItem(`${phase}_started`);
    localStorage.removeItem(`${phase}_completed`);
  }

  resetAll() {
    this.PHASES.forEach(p => this.resetPhase(p));
  }
}
