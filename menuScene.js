// ---------- menuScene.js ----------
// Breakfast memory puzzle menu scene (multi-step sequence)

import { drawSceneImage, fadeOverlay } from './renderUtils.js';
import { drawBox, drawTextCentered } from './ui.js';

export class MenuScene {
  constructor(manager) {
    this.manager = manager;
    this.fade = 1;
    this.cursorCol = 0;
    this.cursorRow = 0;
    this.selected = [];
    this.stage = 'menu'; // 'menu' | 'questions'
    this.questionIndex = 0;
    this.correctAnswers = 0;
    this.feedback = null; // temporary feedback line between questions

    this.bg = new Image();
    this.bg.src = 'assets/menu_bg.png';

    // --- Menu layout ---
    this.categories = [
      {
        title: 'MAIN',
        items: ['Pancakes', 'French Toast', 'Eggs & Bacon', 'Omelette', 'Waffles']
      },
      {
        title: 'SIDE',
        items: ['Hash Browns', 'Toast & Jam', 'Sausage Links', 'Fruit Cup', 'Biscuits']
      },
      {
        title: 'DRINK',
        items: ['Coffee', 'Orange Juice', 'Milk', 'Hot Tea', 'Chocolate Milk']
      }
    ];

    // --- Sophie’s correct combo ---
    this.secretCombo = ['Eggs & Bacon', 'Toast & Jam', 'Coffee'];

    // --- Follow-up questions ---
    this.questions = [
      {
        prompt: 'How do you like your eggs?',
        options: ['Over Easy', 'Scrambled', 'Sunny Side'],
        correct: 'Over Easy',
        feedback: 'The waitress nods. “Good choice. Classic.”'
      },
      {
        prompt: 'What kind of jam with your toast?',
        options: ['Apple', 'Grape', 'Strawberry'],
        correct: 'Strawberry',
        feedback: 'She smiles faintly. “Sweet tooth, huh?”'
      },
      {
        prompt: 'And the coffee?',
        options: ['With Cream', 'Black', 'With Sugar'],
        correct: 'Black',
        feedback: 'Her expression softens. “Black... just like she used to order.”'
      }
    ];

    this.qCursor = 0; // which answer is selected
  }

  init() {
    this.fade = 1;
    this.cursorCol = 0;
    this.cursorRow = 0;
    this.selected = [];
    this.stage = 'menu';
    this.questionIndex = 0;
    this.correctAnswers = 0;
    this.feedback = null;
  }

  update(dt) {
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 400);
  }

  render(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.imageSmoothingEnabled = false;

    // --- background ---
    if (this.bg.complete && this.bg.naturalWidth > 0) {
      drawSceneImage(ctx, this.bg, ctx.canvas);
    } else {
      ctx.fillStyle = '#2b1b0e';
      ctx.fillRect(0, 0, W, H);
    }

    // --- Stage rendering ---
    if (this.stage === 'menu') this.renderMenu(ctx, W, H);
    if (this.stage === 'questions') this.renderQuestions(ctx, W, H);

    fadeOverlay(ctx, this.fade);
  }

  renderMenu(ctx, W, H) {
    const panelW = Math.floor(W * 0.8);
    const panelH = Math.floor(H * 0.75);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    drawBox(ctx, panelX, panelY, panelW, panelH, 'rgba(0,0,0,0.75)', '#fff');
    drawTextCentered(ctx, 'BREAKFAST MENU', panelY + 60);

    const colWidth = panelW / 3;
    const startY = panelY + 130;
    ctx.font = '26px "Pixel-Regular", monospace';
    ctx.textAlign = 'center';

    this.categories.forEach((cat, col) => {
      const colX = panelX + colWidth * col + colWidth / 2;
      ctx.fillStyle = '#ffcc66';
      ctx.fillText(cat.title, colX, startY);

      cat.items.forEach((item, row) => {
        const y = startY + 60 + row * 40;

        // Background highlight for cursor
        if (col === this.cursorCol && row === this.cursorRow) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(colX - colWidth / 2 + 20, y - 20, colWidth - 40, 36);
        }

        // Text color based on state
        if (this.selected.includes(item)) {
          ctx.fillStyle = '#66f'; // selected = blue
        } else if (col === this.cursorCol && row === this.cursorRow) {
          ctx.fillStyle = '#fff'; // hover = white
        } else {
          ctx.fillStyle = '#ccc'; // idle = dim white
        }

        ctx.fillText(item, colX, y + 10);
      });
    });

    drawTextCentered(ctx, '↑↓ Move • ←→ Switch • ENTER Select • ESC Return', H - 60, '#aaa', 20);

    if (this.feedback) {
      drawTextCentered(ctx, this.feedback, H - 120, '#fff', 22);
    }
  }

  renderQuestions(ctx, W, H) {
    const panelW = Math.floor(W * 0.7);
    const panelH = Math.floor(H * 0.5);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;

    const q = this.questions[this.questionIndex];
    if (!q) return; // safety guard

    drawBox(ctx, panelX, panelY, panelW, panelH, 'rgba(0,0,0,0.85)', '#fff');

    // Feedback moment
    if (this.feedback) {
      drawTextCentered(ctx, this.feedback, panelY + panelH / 2, '#fff', 24);
      return;
    }

    drawTextCentered(ctx, `Waitress: "${q.prompt}"`, panelY + 70);
    ctx.font = '26px "Pixel-Regular", monospace';
    ctx.textAlign = 'center';

    q.options.forEach((opt, i) => {
      const y = panelY + 140 + i * 50;
      if (i === this.qCursor) {
        drawBox(ctx, panelX + 40, y - 20, panelW - 80, 40, 'rgba(255,255,255,0.2)', '#fff');
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(opt, W / 2, y + 10);
    });

    drawTextCentered(ctx, '↑↓ Select • ENTER Confirm', panelY + panelH - 40, '#aaa', 18);
  }

  handleInput(e) {
    const key = e.key.toLowerCase();

    // --- MENU STAGE ---
    if (this.stage === 'menu') {
      const currentCat = this.categories[this.cursorCol];
      const item = currentCat.items[this.cursorRow];
      const maxRows = currentCat.items.length;

      if (key === 'arrowdown' || key === 's') {
        this.cursorRow = (this.cursorRow + 1) % maxRows;
        return;
      }
      if (key === 'arrowup' || key === 'w') {
        this.cursorRow = (this.cursorRow - 1 + maxRows) % maxRows;
        return;
      }
      if (key === 'arrowright' || key === 'd') {
        this.cursorCol = (this.cursorCol + 1) % this.categories.length;
        this.cursorRow = 0;
        return;
      }
      if (key === 'arrowleft' || key === 'a') {
        this.cursorCol = (this.cursorCol - 1 + this.categories.length) % this.categories.length;
        this.cursorRow = 0;
        return;
      }

      if (key === 'enter') {
        if (!this.selected.includes(item)) this.selected.push(item);

        // once 3 items picked → check if correct combo
        if (this.selected.length === 3) {
          if (this.secretCombo.every(v => this.selected.includes(v))) {
            this.stage = 'questions';
            this.questionIndex = 0;
            this.qCursor = 0;
          } else {
            this.feedback = 'The waitress frowns. “That doesn’t sound quite right.”';
            setTimeout(() => {
              this.feedback = null;
              this.selected = [];
            }, 1100);
          }
        }
      }

      if (key === 'escape') {
        import('./diner.js').then(({ DinerScene }) =>
          this.manager.set(new DinerScene(this.manager))
        );
      }
      return;
    }

    // --- QUESTIONS STAGE ---
    if (this.stage === 'questions') {
      // during feedback wait, skip input
      if (this.feedback) return;

      const q = this.questions[this.questionIndex];
      if (!q) return;

      if (key === 'arrowdown' || key === 's') {
        this.qCursor = (this.qCursor + 1) % q.options.length;
        return;
      }
      if (key === 'arrowup' || key === 'w') {
        this.qCursor = (this.qCursor - 1 + q.options.length) % q.options.length;
        return;
      }

      if (key === 'enter') {
        const choice = q.options[this.qCursor];
        if (choice === q.correct) this.correctAnswers++;

        // show feedback briefly before next question
        this.feedback = q.feedback;
        setTimeout(() => {
          this.feedback = null;
          this.questionIndex++;
          this.qCursor = 0;

          // After all 3 questions
          if (this.questionIndex >= this.questions.length) {
            if (this.correctAnswers === this.questions.length) {
              this.feedback = 'The waitress smiles. “That’s her order!”';
              localStorage.setItem('napkinFound', 'true');
              localStorage.setItem('menuSolved', 'true');

              this.fade = 1;
              setTimeout(() => {
                import('./diner.js').then(({ DinerScene }) =>
                  this.manager.set(new DinerScene(this.manager))
                );
              }, 800);
            } else {
              this.feedback = 'The waitress tilts her head. “Hmm... maybe I’m thinking of someone else.”';
              setTimeout(() => {
                this.selected = [];
                this.correctAnswers = 0;
                this.questionIndex = 0;
                this.stage = 'menu';
                this.feedback = null;
              }, 1100);
            }
          }
        }, 1000); // 1-second feedback delay
      }
    }
  }
}
