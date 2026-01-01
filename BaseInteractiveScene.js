import { InteractionSystem } from './interactionSystem.js';

export class BaseInteractiveScene {
  constructor(manager) {
    this.manager = manager;
    this.sceneType = "interactive";

    this.canMove = false; // opt-in per scene
    this.interact = new InteractionSystem(this);
  }

  init() {
    // Nothing required here anymore
    // InteractionSystem will auto-recover
  }

  handleInput(e) {
    return this.interact.handleInput(e, this.getActiveObjects?.());
  }

  render(ctx) {
    this.interact.render(ctx, this.getActiveObjects?.());
  }
}
