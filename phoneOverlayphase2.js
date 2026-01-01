// ---------- phoneOverlay_phase2.js ----------
// Phase 2 Phone Overlay
// STRUCTURE MATCHES PHASE 1
// - Calls + Messages
// - Sam message unlocks Sam call
// - Dave unlocks later via apartment flag
// - No busy mode (removed safely)

import { getLayout } from './layout.js';
import { drawTextCentered, drawBox } from './ui.js';
import { PhoneAudio } from './phoneAudio.js';
import { PhaseManager } from './phaseManager.js';

export class PhoneOverlayPhase2 {
  constructor(manager) {
    this.name = 'Phone';
    this.manager = manager;
    this.phaseManager = new PhaseManager();

    // modes: calls | conversation | choice | messages | messageDetail
    this.mode = 'calls';

    this.cursor = 0;
    this.dialogueIndex = 0;
    this.choiceIndex = 0;

    this.flags = {};
    this.calls = [];
    this.messages = [];

    this.activeCall = null;
    this.activeConvo = null;

    this.pendingMessageAlert = false;
  }

  // -------------------------------------------------
  // INIT
  // -------------------------------------------------
  init() {
    this.phaseManager.startPhase("phase2");

    this.activeCall = null;
    this.activeConvo = null;
    this.dialogueIndex = 0;
    this.choiceIndex = 0;

    this.pendingMessageAlert = false;

    const saved = localStorage.getItem("phoneFlags_phase2");
    this.flags = saved ? JSON.parse(saved) : {};

    if (this.flags.samUnlocked === undefined) this.flags.samUnlocked = false;
    if (this.flags.daveUnlocked === undefined) this.flags.daveUnlocked = false;
    if (this.flags.warehouseUnlocked === undefined) this.flags.warehouseUnlocked = false;
    if (this.flags.apartmentUnlocked === undefined) this.flags.apartmentUnlocked = false;

    // -----------------------------
    // MESSAGES (baseline)
    // -----------------------------
    this.messages = [
      {
        id: 'sam',
        from: 'Sam',
        subject: 'We need to talk.',
        text:
          "Hey... it's Sam.\n" +
          "Alex isn’t doing well.\n" +
          "Please go check on him."
      }
    ];

    if (localStorage.getItem("daveCallUnlocked") === "true") {
      this.messages.push({
        id: 'dave',
        from: 'Dave',
        subject: 'What did you find?',
        text:
          "Do you see the person downtown?\n" +
          "I need to know.\n" +
          "Call me."
      });
      this.flags.daveUnlocked = true;
    }

    this.rebuildCalls();

    this.cursor = 0;
    this.mode = 'calls';

    // Reset alerts before recomputing
    this.manager?.overlay?.clearMessageAlert?.();
    this.manager?.overlay?.clearCallAlert?.();

    if (this.calls.some(c => c.active)) {
      window.dispatchEvent(new Event("phoneRingRequested"));
    } else {
      PhoneAudio.stopRing();
    }
    this.markCallsSeen();

    // Alert if new messages appeared since last check
    this.updateMessageCountAndNotify();
    this.updateCallCountAndNotify();
  }

  // -------------------------------------------------
  // HELPERS
  // -------------------------------------------------
  saveFlags() {
    localStorage.setItem("phoneFlags_phase2", JSON.stringify(this.flags));
  }

   notifyNewMessage() {
    this.manager?.overlay?.notifyMessage?.();
  }

  notifyNewCall() {
    this.manager?.overlay?.notifyCall?.();
  }

  markCallsSeen() {
    this.manager?.overlay?.clearCallAlert?.();
    localStorage.setItem(
      "callCount_phase2",
      String(this.getActiveCalls().length)
    );
  }

  markMessagesRead() {
    this.manager?.overlay?.clearMessageAlert?.();
    localStorage.setItem(
      "messageCount_phase2",
      String(this.getVisibleMessages().length)
    );
    this.pendingMessageAlert = false;
  }

  updateMessageCountAndNotify() {
    const key = "messageCount_phase2";
    const stored = localStorage.getItem(key);
    const prev = stored === null ? null : (parseInt(stored, 10) || 0);
    const current = this.getVisibleMessages().length;
    if (prev === null) {
      if (current > 0) this.notifyNewMessage();
      localStorage.setItem(key, String(current));
      return;
    }
    if (current > prev) {
      if (this.isInCallFlow()) {
        this.pendingMessageAlert = true;
      } else {
        this.notifyNewMessage();
      }
    }
    localStorage.setItem(key, String(current));
  }

  updateCallCountAndNotify() {
    const key = "callCount_phase2";
    const stored = localStorage.getItem(key);
    const prev = stored === null ? null : (parseInt(stored, 10) || 0);
    const current = this.getActiveCalls().length;
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

  isInCallFlow() {
    return (
      this.mode === 'conversation' ||
      this.mode === 'choice' ||
      !!this.activeCall
    );
  }

  update(dt) {
    if (this.pendingMessageAlert && !this.isInCallFlow()) {
      this.pendingMessageAlert = false;
      this.notifyNewMessage();
    }
  }

  clampCursor(max) {
    if (max <= 0) {
      this.cursor = 0;
      return;
    }
    if (this.cursor < 0) this.cursor = max - 1;
    if (this.cursor >= max) this.cursor = 0;
  }

  getActiveCalls() {
    return this.calls.filter(c => c.active);
  }

  getVisibleMessages() {
    return this.messages;
  }

  renderTabs(ctx, x, y, w) {
    const tabs = [
      { key: 'calls', label: 'CALLS (1)' },
      { key: 'messages', label: 'MESSAGES (2)' }
    ];

    const active =
      this.mode === 'messages' || this.mode === 'messageDetail'
        ? 'messages'
        : 'calls';

    const tabW = w / 2;
    const tabH = 34;
    const tabY = y + 86;

    tabs.forEach((t, i) => {
      const tabX = x + i * tabW;
      if (t.key === active) {
        drawBox(
          ctx,
          tabX + 6,
          tabY - 4,
          tabW - 12,
          tabH + 8,
          'rgba(255,255,255,0.15)',
          '#fff'
        );
      }
      ctx.font = '20px "Pixel-Regular", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(t.label, tabX + tabW / 2, tabY + tabH / 2 + 2);
    });
  }

  rebuildCalls() {
    this.calls = [];

    if (this.flags.daveUnlocked) {
      this.calls.push({
        id: 'dave',
        name: 'Dave',
        status: 'Call me back.',
        active: true
      });
    }

    if (this.flags.samUnlocked) {
      this.calls.push({
        id: 'sam',
        name: 'Sam',
        status: 'Call me back.',
        active: true
      });
    }

    this.saveFlags();
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);
    drawBox(ctx, x, y, w, h, 'rgba(0,0,0,0.75)', '#fff');
    drawTextCentered(ctx, 'PHONE', y + 50);

    this.renderTabs(ctx, x, y, w);

    if (this.mode === 'calls') return this.renderCallList(ctx, x, y, w, h);
    if (this.mode === 'messages') return this.renderMessageList(ctx, x, y, w, h);
    if (this.mode === 'messageDetail') return this.renderMessageDetail(ctx, x, y, w, h);
    if (this.mode === 'conversation') return this.renderConversation(ctx, x, y, w, h);
    if (this.mode === 'choice') return this.renderChoice(ctx, x, y, w, h);
  }

  // -------------------------------------------------
  // RENDER MODES
  // -------------------------------------------------
  renderCallList(ctx, x, y, w, h) {
    const list = this.getActiveCalls();
    this.clampCursor(list.length);

    drawTextCentered(ctx, 'CALLS', y + 100);

    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.textAlign = 'left';

    list.forEach((c, i) => {
      const ly = y + 160 + i * 60;
      if (i === this.cursor)
        drawBox(ctx, x + 60, ly - 20, w - 120, 44, 'rgba(255,255,255,0.15)', '#fff');

      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, x + 80, ly);
      ctx.fillStyle = '#aaa';
      ctx.fillText(c.status, x + 240, ly);
    });

    drawTextCentered(ctx, '↑↓ Navigate • ENTER Call • 2 Messages • ESC Exit', y + h - 40, '#aaa', 18);
  }

  renderMessageList(ctx, x, y, w, h) {
    const msgs = this.getVisibleMessages();
    this.clampCursor(msgs.length);

    drawTextCentered(ctx, 'MESSAGES', y + 100);
    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.textAlign = 'left';

    msgs.forEach((m, i) => {
      const ly = y + 160 + i * 60;
      if (i === this.cursor)
        drawBox(ctx, x + 60, ly - 20, w - 120, 44, 'rgba(255,255,255,0.15)', '#fff');

      ctx.fillStyle = '#fff';
      ctx.fillText(m.from, x + 80, ly);
      ctx.fillStyle = '#aaa';
      ctx.fillText(m.subject, x + 240, ly);
    });

    drawTextCentered(ctx, '↑↓ Navigate • ENTER Read • 1 Calls • ESC Exit', y + h - 40, '#aaa', 18);
  }

  renderMessageDetail(ctx, x, y, w, h) {
    const msgs = this.getVisibleMessages();
    const msg = msgs[this.cursor];
    if (!msg) {
      this.mode = 'messages';
      return;
    }

    drawTextCentered(ctx, msg.from, y + 80);
    drawTextCentered(ctx, msg.subject, y + 120, '#aaa', 20);

    drawBox(ctx, x + 60, y + 160, w - 120, 260, 'rgba(255,255,255,0.05)', '#aaa');

    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    const lines = this.wrapText(ctx, msg.text, w * 0.75);
    let ly = y + 200;
    lines.forEach(l => {
      ctx.fillText(l, x + w / 2, ly);
      ly += 30;
    });

    drawTextCentered(ctx, 'Press ENTER or ESC', y + h - 40, '#aaa', 18);
  }

  renderConversation(ctx, x, y, w, h) {
    const entry = this.activeConvo?.[this.dialogueIndex];
    if (!entry) {
      drawTextCentered(ctx, 'Call ended.', y + h - 80, '#aaa', 18);
      return;
    }

    const [speaker, text] = entry;

    drawBox(ctx, x + 60, y + 160, w - 120, 220, 'rgba(255,255,255,0.05)', '#aaa');
    ctx.font = '20px "Pixel-Regular", monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText(speaker, x + w / 2, y + 170);

    ctx.font = '22px "Pixel-Regular", monospace';
    ctx.fillStyle = '#fff';

    const lines = this.wrapText(ctx, text, w * 0.75);
    let ly = y + 210;
    lines.forEach(l => {
      ctx.fillText(l, x + w / 2, ly);
      ly += 30;
    });

    drawTextCentered(ctx, 'Press ENTER • ESC Hang up', y + h - 40, '#aaa', 18);
  }

  renderChoice(ctx, x, y, w, h) {
    const options = this.activeCall === 'dave'
      ? ['Tell Dave about the keycard', 'Say nothing']
      : ['I’ll check on Alex.', 'Not now.'];

    drawTextCentered(ctx, 'How do you respond?', y + 120);
    this.clampCursor(options.length);

    options.forEach((opt, i) => {
      const ly = y + 200 + i * 60;
      if (i === this.choiceIndex)
        drawBox(ctx, x + 80, ly - 20, w - 160, 44, 'rgba(255,255,255,0.15)', '#fff');

      ctx.font = '22px "Pixel-Regular", monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(opt, x + w / 2, ly);
    });

    drawTextCentered(ctx, '↑↓ Select • ENTER Confirm • ESC Cancel', y + h - 40, '#aaa', 18);
  }

  // -------------------------------------------------
  // INPUT
  // -------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // Global tab switching
    if (key === '1' && this.mode !== 'calls') {
      this.mode = 'calls';
      this.cursor = 0;
      return;
    }
    if (key === '2' && this.mode === 'calls') {
      this.mode = 'messages';
      this.cursor = 0;
      return;
    }

    if (this.mode === 'messages') {
      const msgs = this.getVisibleMessages();
      if (!msgs.length) return;

      if (key === 'arrowdown') this.cursor++;
      if (key === 'arrowup') this.cursor--;
      if (key === 'enter') {
        this.markMessagesRead();
        this.mode = 'messageDetail';
      }
      if (key === 'escape') this.manager.overlay.hide();

      this.clampCursor(msgs.length);
      return;
    }

    if (this.mode === 'messageDetail') {
      if (key === 'enter' || key === 'escape') {
        const msg = this.getVisibleMessages()[this.cursor];

        if (msg?.id === 'sam') {
          this.flags.samUnlocked = true;
          this.rebuildCalls();

          // Notebook: Sam asks to meet Alex at his apartment
          localStorage.setItem('note_meetAlexApartment', 'true');
          window.dispatchEvent(new CustomEvent('notesUpdate', {
            detail: {
              title: 'Meet Alex at Apartment',
              text: 'Sam wants me to check on Alex at his apartment. Sam seems really worried.'
            }
          }));
        }
        if (msg?.id === 'dave') {
          this.flags.daveUnlocked = true;
          this.rebuildCalls();
        }

        this.markMessagesRead();
        this.mode = 'messages';
        this.cursor = 0;
      }
      return;
    }

    if (this.mode === 'calls') {
      const list = this.getActiveCalls();
      if (!list.length) return;

      if (key === 'arrowdown') this.cursor++;
      if (key === 'arrowup') this.cursor--;

      this.clampCursor(list.length);

      if (key === 'enter') {
        const selected = list[this.cursor];
        if (!selected) return;

        PhoneAudio.playAnswer();

        this.activeCall = selected.id;
        this.activeConvo =
          selected.id === 'dave'
            ? this.daveScript
            : this.samScript;

        this.mode = 'conversation';
        this.dialogueIndex = 0;
      }

      if (key === 'escape') {
        this.manager.overlay.hide();
      }
      return;
    }

    if (this.mode === 'conversation') {
      if (key === 'enter') {
        this.dialogueIndex++;
        if (this.dialogueIndex >= this.activeConvo.length) {
          if (this.activeCall === 'daveFollowup' || this.activeCall === 'samFollowup') {
            PhoneAudio.playHangup();
            this.mode = 'calls';
            this.activeCall = null;
            this.activeConvo = null;
            this.dialogueIndex = 0;
            this.cursor = 0;
          } else {
            this.mode = 'choice';
            this.choiceIndex = 0;
          }
        }
      }
      if (key === 'escape') {
        PhoneAudio.playHangup();
        this.mode = 'calls';
        this.activeCall = null;
        this.activeConvo = null;
        this.dialogueIndex = 0;
        this.cursor = 0;
      }
      return;
    }

    if (this.mode === 'choice') {
      const options = this.activeCall === 'dave' ? 2 : 2;

      if (key === 'arrowdown') this.choiceIndex++;
      if (key === 'arrowup') this.choiceIndex--;

      this.clampCursor(options);

      if (key === 'enter') {
        if (this.activeCall === 'dave' && this.choiceIndex === 0) {
          this.flags.warehouseUnlocked = true;
          localStorage.setItem('warehouseUnlocked', 'true');
          this.saveFlags();
          this.activeCall = 'daveFollowup';
          this.activeConvo = this.daveFollowupScript;
          this.mode = 'conversation';
          this.dialogueIndex = 0;
          return;
        }
        if (this.activeCall === 'sam' && this.choiceIndex === 0) {
          this.flags.apartmentUnlocked = true;
          localStorage.setItem('apartmentUnlocked', 'true');
          this.saveFlags();
          this.activeCall = 'samFollowup';
          this.activeConvo = this.samFollowupScript;
          this.mode = 'conversation';
          this.dialogueIndex = 0;
          return;
        }

        this.saveFlags();
        this.mode = 'calls';
        this.cursor = 0;
        this.activeCall = null;
        this.activeConvo = null;
        this.dialogueIndex = 0;
      }

      if (key === 'escape') {
        this.mode = 'calls';
        this.activeCall = null;
        this.activeConvo = null;
        this.dialogueIndex = 0;
        this.cursor = 0;
      }
    }
  }

  // -------------------------------------------------
  // DIALOGUE SCRIPTS
  // -------------------------------------------------
  get daveScript() {
    return [
      ['Dave', 'You found something downtown, didn’t you?']
    ];
  }

  get samScript() {
    return [
      ['Sam', 'Thank you for calling back.'],
      ['Sam', 'Alex does’t seem like himself lately.'],
      ['Sam', 'Ever since that night at the campsite....'],
      ['Sam', 'He really needs someone right now to check on him.']
    ];
  }

  get daveFollowupScript() {
    return [
      ['Dave', 'So it was a keycard? Good work.'],
      ['Dave', 'Stop by the warehouse and we can discuss this futher.']
    ];
  }

  get samFollowupScript() {
    return [
      ['Sam', 'Thanks. I know you have a lot going on.'],
      ['Sam', 'I think Alex wanted to talk to you about the camping trip.'],
      ['Sam', 'He may have some answers for you.']
    ];
  }

  // -------------------------------------------------
  // WRAP
  // -------------------------------------------------
  wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(' ');
    const lines = [];
    let line = '';

    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}
