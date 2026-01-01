// ---------- phoneOverlayPhase5.js ----------
// FINAL PHONE PHASE — calls only (Sam, Sophie, Dave)
// No messages; repeat calls return "No one answers."

import { getLayout } from "./layout.js";
import { drawTextCentered, drawBox } from "./ui.js";
import { PhoneAudio } from "./phoneAudio.js";
import { PhaseManager } from "./phaseManager.js";

export class PhoneOverlayPhase5 {
  constructor(manager) {
    this.name = "Phone";
    this.manager = manager;
    this.phaseManager = new PhaseManager();

    // modes: calls | conversation
    this.mode = "calls";
    this.cursor = 0;

    this.activeContact = null;
    this.dialogueIndex = 0;
    this.isMessageView = false;
    this.tempScript = null;
    this.endedContacts = new Set();

    // Contact list (calls only)
    this.calls = [
      { id: "sam", name: "Sam", active: true },
      { id: "sophie", name: "Sophie", active: true },
      { id: "dave", name: "Dave", active: true }
    ];

    // Messages (simple list for consistency with earlier phases)
    this.messages = [
      { id: "sam", name: "Sam", unread: true },
      { id: "sophie", name: "Sophie", unread: true },
      { id: "dave", name: "Dave", unread: true }
    ];

    this.pendingMessageAlert = false;

    // Dialogue scripts
    this.scripts = {
      sam: {
        call: [
          ["Sam", "…"],
          ["Sam", "I don’t know how else to say this."],
          ["Sam", "They came by my place."],
          ["Sam", "Asked me about you."],
          ["Sam", "About Alex."],
          ["Sam", "I told them I didn’t know anything."],
          ["Sam", "But I don’t think that helped."],
          ["Sam", "You’ve been acting… off."],
          ["Sam", "We are really concerned about you but we can't stay in contact."],
          ["Sam", "Please don’t call me again."]
        ]
      },
      sophie: {
        call: [
          ["Sophie", "I was hoping it wasn’t true."],
          ["Sophie", "They asked me where you go at night."],
          ["Sophie", "What you talk about."],
          ["Sophie", "What Alex trusted you with."],
          ["Sophie", "I don’t know what you’re mixed up in."],
          ["Sophie", "But I can’t be part of it."],
          ["Sophie", "I hope you understand."],
          ["Sophie", "Goodbye."]
        ]
      },
      dave: {
        call: [
          ["Dave", "This is a bad situation."],
          ["Dave", "They asked me about the warehouse."],
          ["Dave", "About why I sent you to the observatory to deliver that package."],
          ["Dave", "About Alex."],
          ["Dave", "They're watching me, probably know that we're talking right now."],
          ["Dave", "Whatever you’re involved in…"],
          ["Dave", "I want no part of it."]
        ]
      }
    };
  }

  // -------------------------------------------------
  // INIT
  // -------------------------------------------------
  init() {
    this.mode = "calls";
    this.cursor = 0;
    this.activeContact = null;
    this.dialogueIndex = 0;
    this.isMessageView = false;
    this.tempScript = null;

    PhoneAudio.stopRing();

    // Reset alerts before recomputing
    this.manager?.overlay?.clearMessageAlert?.();
    this.manager?.overlay?.clearCallAlert?.();

    this.updateCallCountAndNotify();
    this.updateMessageCountAndNotify();
    this.markCallsSeen();
    this.markMessagesRead();
  }

  // -------------------------------------------------
  // INPUT
  // -------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    if (this.mode === "conversation") {
      if (key === "enter") {
        this.advanceDialogue();
      }
      return;
    }

    if (key === "escape") {
      this.manager.overlay.hide();
      return;
    }

    if (key === "1" && this.mode !== "conversation") {
      this.mode = "calls";
      this.cursor = 0;
      this.markCallsSeen();
      return;
    }

    if (key === "2" && this.mode !== "conversation") {
      this.mode = "messages";
      this.cursor = 0;
      this.markMessagesRead();
      return;
    }

    const list = this.mode === "messages" ? this.messages : this.calls;

    if (key === "arrowup") {
      this.cursor = (this.cursor - 1 + list.length) % list.length;
      return;
    }

    if (key === "arrowdown") {
      this.cursor = (this.cursor + 1) % list.length;
      return;
    }

    if (key === "enter") {
      this.openSelected();
    }
  }

  // -------------------------------------------------
  // CONVERSATION FLOW
  // -------------------------------------------------
  openSelected() {
    if (this.mode === "messages") {
      const entry = this.messages[this.cursor];
      if (!entry) return;

      this.activeContact = entry.id;
      this.dialogueIndex = 0;
      this.isMessageView = true;
      this.mode = "conversation";
      entry.unread = false;
      this.markMessagesRead();
      PhoneAudio.playAnswer();
      return;
    }

    const entry = this.calls[this.cursor];
    if (!entry) return;

    this.activeContact = entry.id;
    this.dialogueIndex = 0;
    this.isMessageView = false;
    this.mode = "conversation";

    if (this.endedContacts.has(entry.id)) {
      this.tempScript = [["", "No one answers."]];
      PhoneAudio.playHangup();
    } else {
      this.tempScript = null;
      PhoneAudio.playAnswer();
    }
  }

  advanceDialogue() {
    const script = this.scripts[this.activeContact];
    const lines = this.tempScript
      ? this.tempScript
      : this.isMessageView
        ? script?.message?.map(t => ["", t])
        : script?.call;
    if (!lines || !lines.length) return;

    this.dialogueIndex++;

    if (this.dialogueIndex >= lines.length) {
      PhoneAudio.playHangup();
      this.endConversation();
    }
  }

  endConversation() {
    if (this.activeContact) {
      if (!this.isMessageView) {
        this.endedContacts.add(this.activeContact);
      }
    }

    this.activeContact = null;
    this.tempScript = null;
    this.mode = "calls";
    this.cursor = 0;
    this.isMessageView = false;
  }

  // -------------------------------------------------
  // HELPERS / COUNTS
  // -------------------------------------------------
  notifyNewMessage() {
    this.manager?.overlay?.notifyMessage?.();
  }

  notifyNewCall() {
    this.manager?.overlay?.notifyCall?.();
  }

  markCallsSeen() {
    this.manager?.overlay?.clearCallAlert?.();
    localStorage.setItem(
      "callCount_phase5",
      String(this.calls.filter(c => c.active).length)
    );
  }

  markMessagesRead() {
    this.manager?.overlay?.clearMessageAlert?.();
    localStorage.setItem("messageCount_phase5", String(this.messages.length));
    this.pendingMessageAlert = false;
  }

  updateCallCountAndNotify() {
    const key = "callCount_phase5";
    const stored = localStorage.getItem(key);
    const prev = stored === null ? null : (parseInt(stored, 10) || 0);
    const current = this.calls.filter(c => c.active).length;
    if (prev === null) {
      if (current > 0) this.notifyNewCall();
      localStorage.setItem(key, String(current));
      return;
    }
    if (current > prev) {
      this.notifyNewCall();
    }
    localStorage.setItem(key, String(current));
  }

  updateMessageCountAndNotify() {
    const key = "messageCount_phase5";
    const stored = localStorage.getItem(key);
    const prev = stored === null ? null : (parseInt(stored, 10) || 0);
    const current = this.messages.length;
    if (prev === null) {
      if (current > 0) this.notifyNewMessage();
      localStorage.setItem(key, String(current));
      return;
    }
    if (current > prev) {
      if (this.mode === "conversation") {
        this.pendingMessageAlert = true;
      } else {
        this.notifyNewMessage();
      }
    }
    localStorage.setItem(key, String(current));
  }

  // -------------------------------------------------
  // UPDATE
  // -------------------------------------------------
  update() {}

  renderTabs(ctx, x, y, w) {
    const tabs = [
      { key: "calls", label: "CALLS (1)" },
      { key: "messages", label: "MESSAGES (2)" }
    ];

    const active = this.mode === "messages" ? "messages" : "calls";
    const tabW = w / tabs.length;
    const tabH = 34;
    const tabY = y + 86;

    tabs.forEach((t, i) => {
      const tabX = x + i * tabW;
      if (t.key === active) {
        drawBox(ctx, tabX + 6, tabY - 4, tabW - 12, tabH + 8, "rgba(255,255,255,0.15)", "#fff");
      }
      ctx.font = '20px "Pixel-Regular", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(t.label, tabX + tabW / 2, tabY + tabH / 2 + 2);
    });
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);

    drawBox(ctx, x, y, w, h, "rgba(0,0,0,0.9)", "#666");
    this.renderTabs(ctx, x, y, w);

    if (this.mode === "conversation") {
      this.renderConversation(ctx, x, y, w, h);
      return;
    }

    if (this.mode === "calls") {
      this.renderCallList(ctx, x, y, w, h);
    } else {
      this.renderMessageList(ctx, x, y, w, h);
    }
  }

  renderConversation(ctx, x, y, w, h) {
    const script = this.scripts[this.activeContact];
    const lines = this.tempScript
      ? this.tempScript
      : this.isMessageView
        ? script?.message?.map(t => ["", t])
        : script?.call;
    if (!lines) return;

    const line = lines[this.dialogueIndex] || lines[lines.length - 1];

    const boxW = w - 160;
    const boxH = 160;
    const boxX = x + 80;
    const boxY = y + h / 2 - boxH / 2;

    drawBox(ctx, boxX, boxY, boxW, boxH, "rgba(0,0,0,0.75)", "#444");

    ctx.font = '19px "Pixel-Regular"';
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText(line[1], boxX + 20, boxY + boxH / 2);

    drawTextCentered(ctx, "ENTER Continue", y + h - 60, "#777", 18);
  }

  renderCallList(ctx, x, y, w, h) {
    let lineY = y + 130;
    ctx.font = '22px "Pixel-Regular"';
    ctx.textAlign = "left";

    this.calls.forEach((entry, i) => {
      const isSelected = i === this.cursor;
      if (isSelected) {
        drawBox(ctx, x + 60, lineY - 24, w - 120, 44, "rgba(255,255,255,0.15)", "#fff");
      }

      ctx.fillStyle = entry.active === false ? "#555" : "#ddd";
      ctx.fillText(entry.name, x + 80, lineY);

      lineY += 44;
    });

    drawTextCentered(
      ctx,
      "↑/↓ Navigate   ENTER Call   2 Messages   ESC Exit",
      y + h - 40,
      "#777",
      18
    );
  }

  renderMessageList(ctx, x, y, w, h) {
    let lineY = y + 130;
    ctx.font = '22px "Pixel-Regular"';
    ctx.textAlign = "left";

    this.messages.forEach((entry, i) => {
      const isSelected = i === this.cursor;
      if (isSelected) {
        drawBox(ctx, x + 60, lineY - 24, w - 120, 44, "rgba(255,255,255,0.15)", "#fff");
      }

      ctx.fillStyle = entry.unread ? "#fff" : "#aaa";
      ctx.fillText(entry.name, x + 80, lineY);
      ctx.fillStyle = entry.unread ? "#66f" : "#666";
      ctx.fillText(entry.unread ? "unread" : "read", x + 220, lineY);

      lineY += 44;
    });

    drawTextCentered(
      ctx,
      "↑/↓ Navigate   ENTER Read   1 Calls   ESC Exit",
      y + h - 40,
      "#777",
      18
    );
  }
}
