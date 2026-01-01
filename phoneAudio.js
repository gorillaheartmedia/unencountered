// ---------- phoneAudio.js ----------
// Safe, idempotent phone audio controller

let ringing = false;

export const PhoneAudio = {
  ring: new Audio("assets/sounds/phone_ring.wav"),
  answer: new Audio("assets/sounds/phone_answer.wav"),
  hangup: new Audio("assets/sounds/phone_hangup.wav"),

  playRing() {
    if (ringing) return; // 🛑 already ringing
    ringing = true;

    try {
      this.ring.pause();
      this.ring.currentTime = 0;
      this.ring.loop = true;
      this.ring.play();
    } catch (e) {
      // autoplay / browser refusal — fail silently
    }
  },

  stopRing() {
    if (!ringing) {
      // still reset just in case
      try {
        this.ring.pause();
        this.ring.currentTime = 0;
      } catch (e) {}
      return;
    }

    ringing = false;

    try {
      this.ring.pause();
      this.ring.currentTime = 0;
    } catch (e) {}
  },

  playAnswer() {
    this.stopRing();
    try {
      this.answer.pause();
      this.answer.currentTime = 0;
      this.answer.play();
    } catch (e) {}
  },

  playHangup() {
    this.stopRing();
    try {
      this.hangup.pause();
      this.hangup.currentTime = 0;
      this.hangup.play();
    } catch (e) {}
  }
};
