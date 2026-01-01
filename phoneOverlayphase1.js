// ---------- phoneOverlay_phase1.js ----------
// Phase 1 ONLY: Gordon + Early Dave + Sophie
// Branching call and message unlock system (early game)
// No Phase 2 logic here.
//
// 🔊 Added phone sounds (ring / answer / hangup) WITHOUT removing features.
// Uses assets/sounds/
//
// Required PhoneAudio API:
//   PhoneAudio.playRing()
//   PhoneAudio.stopRing()
//   PhoneAudio.playAnswer()
//   PhoneAudio.playHangup()

import { getLayout } from './layout.js';
import { drawTextCentered, drawBox } from './ui.js';
import { PhoneAudio } from './phoneAudio.js';
import { PhaseManager } from './phaseManager.js';

export class PhoneOverlayPhase1 {
  constructor(manager) {
    this.name = 'Phone';
    this.manager = manager;
    this.phaseManager = new PhaseManager();

    // modes: 'calls' | 'conversation' | 'choice' | 'busy' | 'messages' | 'messageDetail'
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

  // ---------- INIT ----------
  init() {
    // NOTE:
    // We DO NOT complete phase 1 here.
    // Phase 1 should remain active until Secret Street keycard logic, etc.
    // Also we should NOT auto-hide the overlay based on "phase1 completed" here.

    // Start marker is fine if you use it elsewhere, but it will not complete/advance.
    // If your PhaseManager "startPhase" causes unwanted behavior, you can remove this line.
    this.phaseManager.startPhase("phase1");

    const savedFlags = localStorage.getItem('phoneFlags');
    this.flags = savedFlags ? JSON.parse(savedFlags) : {};

    const hasGordon = localStorage.getItem('gordonFirstDone') === 'true';
    this.flags.gordonDone = hasGordon;

    // ---- Phase 1 flags ----
    if (this.flags.daveUnlocked === undefined) this.flags.daveUnlocked = false;
    if (this.flags.downtownUnlocked === undefined) this.flags.downtownUnlocked = false;
    if (this.flags.sophieUnlocked === undefined) this.flags.sophieUnlocked = false;
    if (this.flags.sophieMessageUnlocked === undefined) this.flags.sophieMessageUnlocked = false;
    if (this.flags.dinerUnlocked === undefined) this.flags.dinerUnlocked = false;

    // ---- Phase 1 messages baseline ----
    this.messages = [
      {
        id: 'dave',
        from: 'Dave',
        subject: 'Got a minute?',
        text: "I saw a suspicious person downtown. Call me back when you can."
      },
      {
        id: 'sophie',
        from: 'Sophie',
        subject: 'Call me when you can.',
        text:
          "I left something at the diner. You may need it. Give me a call." 
      }
    ];

    // ---- Phase 1 calls baseline ----
    // IMPORTANT: Calls are computed from flags each init,
    // so if we update flags mid-session we should also refresh `this.calls`.
    this.calls = [
      {
        id: 'gordon',
        name: 'Gordon',
        status: hasGordon ? 'Busy signal...' : 'Incoming call...',
        active: true
      },
      {
        id: 'dave',
        name: 'Dave',
        status: this.flags.daveUnlocked ? 'Call me when you can.' : 'Locked',
        active: this.flags.daveUnlocked
      },
      {
        id: 'sophie',
        name: 'Sophie',
        status: this.flags.sophieUnlocked ? 'You should call me.' : 'Locked',
        active: this.flags.sophieUnlocked
      }
    ];

    this.cursor = 0;
    this.dialogueIndex = 0;
    this.choiceIndex = 0;
    this.mode = 'calls';
    this.pendingMessageAlert = false;

    // Reset alerts before recomputing
    this.manager?.overlay?.clearMessageAlert?.();
    this.manager?.overlay?.clearCallAlert?.();

    // 🔊 Ring only if something is actually incoming
    if (this.calls.some(c => c.active && typeof c.status === 'string' && c.status.includes('Incoming'))) {
      window.dispatchEvent(new Event("phoneRingRequested"));
    } else {
      PhoneAudio.stopRing();
    }
    this.markCallsSeen();

    // Alert if new messages appeared since last check
    this.updateMessageCountAndNotify();
    // Alert if new calls unlocked
    this.updateCallCountAndNotify();
  }

  // ---------- HELPERS ----------
  getActiveCalls() {
    return this.calls.filter(c => c.active);
  }

  getVisibleMessages() {
    return this.messages.filter(m => {
      if (m.id === 'dave') return true;
      if (m.id === 'sophie') return this.flags.sophieMessageUnlocked;
      return false;
    });
  }

  clampCursor(max) {
    if (max <= 0) {
      this.cursor = 0;
      return;
    }
    if (this.cursor < 0) this.cursor = max - 1;
    if (this.cursor >= max) this.cursor = 0;
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
      "callCount_phase1",
      String(this.getActiveCalls().length)
    );
  }

  markMessagesRead() {
    this.manager?.overlay?.clearMessageAlert?.();
    localStorage.setItem(
      "messageCount_phase1",
      String(this.getVisibleMessages().length)
    );
    this.pendingMessageAlert = false;
  }

  updateMessageCountAndNotify() {
    const key = "messageCount_phase1";
    const stored = localStorage.getItem(key);
    const prev = stored === null ? null : (parseInt(stored, 10) || 0);
    const current = this.getVisibleMessages().length;
    if (prev === null) {
      if (current > 0) this.notifyNewMessage();
      localStorage.setItem(key, String(current));
      return;
    }
    if (current > prev) {
      // Defer if currently in a call/choice flow
      if (this.isInCallFlow()) {
        this.pendingMessageAlert = true;
      } else {
        this.notifyNewMessage();
      }
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
    // Release pending alerts once we are out of a call flow
    if (this.pendingMessageAlert && !this.isInCallFlow()) {
      this.pendingMessageAlert = false;
      this.notifyNewMessage();
    }
  }

  updateCallCountAndNotify() {
    const key = "callCount_phase1";
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

  // Render top tabs to show current view
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

  saveFlags() {
    localStorage.setItem('phoneFlags', JSON.stringify(this.flags));
  }

  // ✅ NEW: refresh calls from current flags (fixes Dave not appearing after message read)
  rebuildCalls() {
    const hasGordon = localStorage.getItem('gordonFirstDone') === 'true';
    this.flags.gordonDone = hasGordon;

    this.calls = [
      {
        id: 'gordon',
        name: 'Gordon',
        status: this.flags.gordonDone ? 'Busy signal...' : 'Incoming call...',
        active: true
      },
      {
        id: 'dave',
        name: 'Dave',
        status: this.flags.daveUnlocked ? 'Call me when you can.' : 'Locked',
        active: this.flags.daveUnlocked
      },
      {
        id: 'sophie',
        name: 'Sophie',
        status: this.flags.sophieUnlocked ? 'You should call me.' : 'Locked',
        active: this.flags.sophieUnlocked
      }
    ];
  }

  // ---------- RENDER ----------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);
    drawBox(ctx, x, y, w, h, 'rgba(0,0,0,0.75)', '#fff');
    drawTextCentered(ctx, 'PHONE', y + 50);

    // Mode tabs (Calls / Messages)
    this.renderTabs(ctx, x, y, w);

    // --- BUSY MODE ---
    if (this.mode === 'busy') {
      drawTextCentered(ctx, 'Dialing...', y + 140);
      drawTextCentered(ctx, 'Busy signal.', y + 280);
      drawTextCentered(ctx, 'Press ESC to hang up', y + h - 60, '#aaa', 20);
      return;
    }

    // --- CONVERSATION MODE ---
    if (this.mode === 'conversation') {
      const convo = this.activeConvo || [];
      const entry = convo[this.dialogueIndex];

      if (!entry) {
        drawTextCentered(ctx, 'Call ended.', y + h - 100, '#aaa', 22);
        drawTextCentered(ctx, 'Press ESC to hang up', y + h - 60, '#aaa', 20);
        return;
      }

      const [speaker, text] = entry;
      const msgY = y + 140;

      drawBox(ctx, x + 60, msgY - 20, w - 120, 220, 'rgba(255,255,255,0.05)', '#aaa');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = speaker === 'Gordon' ? '#66f' : '#aaa';
      ctx.font = '20px "Pixel-Regular", monospace';
      ctx.fillText(speaker, ctx.canvas.width / 2, msgY - 10);

      ctx.fillStyle = '#fff';
      ctx.font = '22px "Pixel-Regular", monospace';

      const lines = this.wrapText(ctx, text, w * 0.8);
      let lineY = msgY + 20;
      lines.forEach(line => {
        ctx.fillText(line, ctx.canvas.width / 2, lineY);
        lineY += 32;
      });

      drawTextCentered(ctx, 'Press ENTER to continue or ESC to hang up', y + h - 40, '#aaa', 18);
      return;
    }

    // --- CHOICE MODE ---
    if (this.mode === 'choice') {
      drawTextCentered(ctx, 'How do you respond?', y + 120);

      let choices = ['Tell me more.', "I don’t have time now."];

      if (this.activeCall === 'sophie') {
        choices = ['I’ll go check.', 'Forget it.'];
      } else if (this.activeCall === 'daveIntro') {
        choices = ['Tell me more.', "I don’t have time now."];
      }

      ctx.font = '24px "Pixel-Regular", monospace';
      ctx.textAlign = 'center';

      this.clampCursor(choices.length);

      choices.forEach((opt, i) => {
        const lineY = y + 200 + i * 60;
        if (i === this.choiceIndex) {
          drawBox(ctx, x + w / 2 - 180, lineY - 25, 360, 50, 'rgba(255,255,255,0.15)', '#fff');
        }
        ctx.fillStyle = '#fff';
        ctx.fillText(opt, x + w / 2, lineY);
      });

      drawTextCentered(ctx, '↑↓ to navigate • ENTER choose • ESC hang up', y + h - 60, '#aaa', 18);
      return;
    }

    // --- MESSAGE DETAIL ---
    if (this.mode === 'messageDetail') {
      const visibleMessages = this.getVisibleMessages();
      this.clampCursor(visibleMessages.length);

      const msg = visibleMessages[this.cursor];
      if (!msg) {
        this.mode = 'messages';
        this.cursor = 0;
        return;
      }

      drawTextCentered(ctx, msg.from, y + 80);
      drawTextCentered(ctx, msg.subject, y + 120, '#aaa', 20);

      const msgY = y + 160;
      drawBox(ctx, x + 60, msgY - 20, w - 120, 260, 'rgba(255,255,255,0.05)', '#aaa');

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '22px "Pixel-Regular", monospace';
      ctx.fillStyle = '#fff';

      const lines = this.wrapText(ctx, msg.text, w * 0.8);
      let lineY = msgY + 20;
      lines.forEach(line => {
        ctx.fillText(line, ctx.canvas.width / 2, lineY);
        lineY += 32;
      });

      drawTextCentered(ctx, 'Press ENTER or ESC to return', y + h - 40, '#aaa', 18);
      return;
    }

    // --- MESSAGES LIST ---
    if (this.mode === 'messages') {
      drawTextCentered(ctx, 'MESSAGES', y + 100);

      const visibleMessages = this.getVisibleMessages();
      this.clampCursor(visibleMessages.length);

      const listY = y + 150;
      const marginX = x + 60;

      ctx.textAlign = 'left';
      ctx.font = '22px "Pixel-Regular", monospace';

      visibleMessages.forEach((m, i) => {
        const entryY = listY + i * 60;

        if (i === this.cursor) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(marginX - 20, entryY - 4, w - 120, 44);
        }

        ctx.fillStyle = '#fff';
        ctx.fillText(m.from, marginX, entryY);
        ctx.fillStyle = '#aaa';
        ctx.fillText(m.subject, marginX + 180, entryY);
      });

      drawTextCentered(ctx, '↑↓ Navigate • ENTER Read • 1 Calls', y + h - 40, '#aaa', 18);
      return;
    }

    // --- CALLS LIST ---
    drawTextCentered(ctx, 'CALLS', y + 100);

    const activeCalls = this.getActiveCalls();
    this.clampCursor(activeCalls.length);

    const listY = y + 150;
    const marginX = x + 60;

    ctx.textAlign = 'left';
    ctx.font = '22px "Pixel-Regular", monospace';

    activeCalls.forEach((c, i) => {
      const entryY = listY + i * 60;

      if (i === this.cursor) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(marginX - 20, entryY - 4, w - 120, 44);
      }

      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, marginX, entryY);

      ctx.fillStyle = '#aaa';
      ctx.fillText(c.status, marginX + 180, entryY);
    });

    drawTextCentered(ctx, '↑↓ Navigate • ENTER Call • 2 Messages', y + h - 40, '#aaa', 18);
  }

  // ---------- INPUT ----------
  handleInput(e) {
    const key = e.key.toLowerCase();

    // -------------------------------------------------
    // GLOBAL: allow switching between Calls/Messages
    // -------------------------------------------------
    // (This prevents "stuck" situations if you press 1/2 in the wrong sub-menu.)
    if (key === '1' && this.mode !== 'calls' && this.mode !== 'conversation' && this.mode !== 'choice' && this.mode !== 'busy') {
      this.mode = 'calls';
      this.cursor = 0;
      return;
    }
    if (key === '2' && this.mode === 'calls') {
      this.mode = 'messages';
      this.cursor = 0;
      return;
    }

    // --- BUSY MODE ---
    if (this.mode === 'busy') {
      if (key === 'escape' || key === 'enter') {
        PhoneAudio.playHangup();
        this.mode = 'calls';
      }
      return;
    }

    // --- CONVERSATION MODE ---
    if (this.mode === 'conversation') {
      const convo = this.activeConvo || [];

      if (key === 'enter') {
        this.dialogueIndex++;

        // Finished conversation
        if (this.dialogueIndex >= convo.length) {
          if (this.activeCall === 'gordon') {
            // ✅ FIX: mark Gordon as done (busy signal) but DO NOT complete the phase
            this.flags.gordonDone = true;
            localStorage.setItem('gordonFirstDone', 'true');
            this.saveFlags();

            // refresh call list so status changes immediately
            this.rebuildCalls();

          this.mode = 'calls';
          this.dialogueIndex = 0;
          this.activeCall = null;
          this.activeConvo = null;
          this.updateMessageCountAndNotify();

          // Stop ring if it was playing for incoming
          PhoneAudio.stopRing();
            PhoneAudio.playHangup();
            return;
          }

          if (this.activeCall === 'daveIntro') {
            this.mode = 'choice';
            this.choiceIndex = 0;
            return;
          }

          if (this.activeCall === 'daveFollowup') {
            this.mode = 'calls';
            this.activeCall = null;
            this.activeConvo = null;
            this.updateMessageCountAndNotify();
            return;
          }

          if (this.activeCall === 'sophie') {
            this.mode = 'choice';
            this.choiceIndex = 0;
            return;
          }

          if (this.activeCall === 'sophieFollowup') {
            this.mode = 'calls';
            this.activeCall = null;
            this.activeConvo = null;
            this.updateMessageCountAndNotify();
            return;
          }

          // fallback
          this.mode = 'calls';
          this.activeCall = null;
          this.activeConvo = null;
          return;
        }

        return;
      }

      if (key === 'escape') {
        PhoneAudio.playHangup();
        this.mode = 'calls';
        this.activeCall = null;
        this.activeConvo = null;
        this.updateMessageCountAndNotify();
        return;
      }

      return;
    }

    // --- CHOICE MODE ---
    if (this.mode === 'choice') {
      let choices = ['Tell me more.', "I don’t have time now."];

      if (this.activeCall === 'sophie') {
        choices = ['I’ll go check.', 'Forget it.'];
      }

      if (key === 'arrowdown' || key === 's') {
        this.choiceIndex = (this.choiceIndex + 1) % choices.length;
        return;
      }
      if (key === 'arrowup' || key === 'w') {
        this.choiceIndex = (this.choiceIndex - 1 + choices.length) % choices.length;
        return;
      }
      if (key === 'escape') {
        this.mode = 'calls';
        return;
      }

      if (key === 'enter') {
        if (this.activeCall === 'sophie') {
          if (this.choiceIndex === 0) {
            this.flags.dinerUnlocked = true;
            this.saveFlags();
            localStorage.setItem('note_dinerUnlocked', 'true');
            window.dispatchEvent(new CustomEvent('notesUpdate', {
              detail: {
                title: 'Diner Lead',
                text: 'Sophie pointed you to the diner. The waitress is expecting you.'
              }
            }));

            this.activeCall = 'sophieFollowup';
            this.activeConvo = [
              ['You', 'Alright, I’ll check the diner.'],
              ['Sophie', 'The waitress knows me because I always have the same order. '],
              ['Sophie', 'Remember this: Eggs and Bacon, Toast & Jam, and Coffee'],
              ['Sophie', 'I like my eggs OVEREASY, my favorite jam is STRAWBERRY, and I drink my coffee BLACK'],
            ];
          } else {
            this.activeCall = 'sophieFollowup';
            this.activeConvo = [['Sophie', 'Alright. Maybe it’s better left lost.']];
          }

          this.mode = 'conversation';
          this.dialogueIndex = 0;
          return;
        }

        if (this.activeCall === 'daveIntro') {
          if (this.choiceIndex === 0) {
            this.flags.downtownUnlocked = true;
            this.flags.sophieMessageUnlocked = true;
            this.saveFlags();
            this.updateMessageCountAndNotify();

            this.activeCall = 'daveFollowup';
            this.activeConvo = [
              ['Dave', 'There was a suspicious person there.'],
              ['Dave', 'I wasn’t able to get a good look at them, but they looked offical by the way they were dressed.'],
              ['You', 'Got it. I’ll head downtown.']
            ];
          } else {
            this.activeCall = 'daveFollowup';
            this.activeConvo = [['Dave', 'Alright, another time.']];
          }

          this.mode = 'conversation';
          this.dialogueIndex = 0;
          return;
        }
      }

      return;
    }

    // --- MESSAGE DETAIL ---
    if (this.mode === 'messageDetail') {
      if (key === 'enter' || key === 'escape') {
        const visibleMessages = this.getVisibleMessages();
        const msg = visibleMessages[this.cursor];

        // ✅ FIX: reading Dave message unlocks Dave call immediately
        if (msg?.id === 'dave') {
          this.flags.daveUnlocked = true;
        }

        if (msg?.id === 'sophie') {
          this.flags.sophieUnlocked = true;
        }

        this.saveFlags();
        this.rebuildCalls(); // ✅ ensure calls list reflects newly unlocked calls
        this.markMessagesRead();

        this.mode = 'messages';
      }
      return;
    }

    // --- MESSAGES LIST ---
    if (this.mode === 'messages') {
      const visibleMessages = this.getVisibleMessages();
      this.clampCursor(visibleMessages.length);

      if (key === 'arrowdown' || key === 's') {
        this.cursor = (this.cursor + 1) % visibleMessages.length;
        return;
      }
      if (key === 'arrowup' || key === 'w') {
        this.cursor = (this.cursor - 1 + visibleMessages.length) % visibleMessages.length;
        return;
      }

      if (key === 'enter') {
        this.markMessagesRead();
        this.mode = 'messageDetail';
        return;
      }

      if (key === '1') {
        this.mode = 'calls';
        this.cursor = 0;
        return;
      }

      if (key === 'escape') {
        PhoneAudio.playHangup();
        this.manager.overlay.hide();
        return;
      }

      return;
    }

    // --- CALLS LIST ---
    if (this.mode === 'calls') {
      const activeCalls = this.getActiveCalls();
      if (!activeCalls.length) return;

      if (key === 'arrowdown' || key === 's') {
        this.cursor = (this.cursor + 1) % activeCalls.length;
        return;
      }
      if (key === 'arrowup' || key === 'w') {
        this.cursor = (this.cursor - 1 + activeCalls.length) % activeCalls.length;
        return;
      }

      if (key === '2') {
        this.mode = 'messages';
        this.cursor = 0;
        return;
      }

      if (key === 'escape') {
        PhoneAudio.playHangup();
        this.manager.overlay.hide();
        return;
      }

      if (key === 'enter') {
        const selected = activeCalls[this.cursor];

        PhoneAudio.stopRing();
        PhoneAudio.playAnswer();

        if (selected.id === 'gordon') {
          // If Gordon is already done, show busy screen (optional),
          // but you said previously it becomes "Busy signal..." on the list.
          // We'll keep it callable; if you want it to always busy, flip to busy mode here.
          if (this.flags.gordonDone) {
            this.mode = 'busy';
            return;
          }

          this.activeCall = 'gordon';
          this.activeConvo = this.gordonScript;
        }

        if (selected.id === 'dave') {
          this.activeCall = 'daveIntro';
          this.activeConvo = this.daveIntroScript;
        }

        if (selected.id === 'sophie') {
          this.activeCall = 'sophie';
          this.activeConvo = this.sophieIntroScript;
        }

        this.mode = 'conversation';
        this.dialogueIndex = 0;
      }

      return;
    }
  }

  // ---------- DIALOGUES ----------
  get gordonScript() {
    return [
      ['You', 'Gordon. We need to talk about what happened that night.'],
      ['Gordon', 'Not a good time. Later?'],
      ['You', 'It’s been two weeks since that night.'],
      ['You', 'Something was off that night. You felt it too.'],
      ['Gordon', 'I felt tired. Everyone was tired.'],
      ['You', 'So you think that we all imagined what happened out there? That all of us were just dreaming?'],
      ['Gordon', 'Look, I’m really busy. We are all really busy. Maybe we can talk some other time.'],
      ['You', '.......'],
      ['Gordon', 'We are all worried about you.'],
      ['Gordon', 'Just let this go.']
    ];
  }

  get daveIntroScript() {
    return [
      ['You', 'Hey Dave, got your message.'],
      ['Dave', 'About last night. We saw something downtown.']
    ];
  }

  get sophieIntroScript() {
    return [
      ['You', 'Sophie, hey.'],
      ['Sophie', 'I left directions on a napkin at the diner.'],
      ['Sophie', 'It was directions to the place where me and Dave saw that person last night.']
    ];
  }

  // ---------- WRAP TEXT ----------
  wrapText(ctx, text, maxWidth) {
    if (!text || typeof text !== 'string') return [];
    const words = text.split(' ');
    const lines = [];
    let current = '';

    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
