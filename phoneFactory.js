// phoneFactory.js
import { PhoneOverlayPhase1 } from "./phoneOverlayphase1.js";
import { PhoneOverlayPhase2 } from "./phoneOverlayphase2.js";
import { PhoneOverlayPhase3 } from "./phoneOverlayphase3.js";
import { PhoneOverlayPhase4 } from "./phoneOverlayphase4.js";
import { PhaseManager } from "./phaseManager.js";

export function createPhoneOverlay(manager) {
  const phases = new PhaseManager();

  // Highest phase wins (only if ready and not completed)
  if (phases.isReady?.("phase4") && !phases.isCompleted("phase4")) {
    return new PhoneOverlayPhase4(manager);
  }

  if (phases.isReady?.("phase3") && !phases.isCompleted("phase3")) {
    return new PhoneOverlayPhase3(manager);
  }

  // Otherwise fall back to your normal progression
  // (You can swap 1/2 ordering if your game logic differs)
  return new PhoneOverlayPhase2(manager);
  // return new PhoneOverlayPhase1(manager);
}
