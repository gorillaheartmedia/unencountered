export class BaseCinematicScene {
  constructor(manager) {
    this.manager = manager;
    this.sceneType = "cinematic";
  }

  handleInput(e) {
    // Cinematic scenes fully own input
  }
}
