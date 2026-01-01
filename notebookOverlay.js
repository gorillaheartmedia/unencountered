import { drawCenteredPanel, drawTextCentered, drawBox } from './ui.js';

export class NotebookOverlay {
  constructor(manager) {
    this.name = 'Notebook';
    this.manager = manager;
    this.notes = [];
    this.page = 0;
    this.pageSize = 6;

    // Sound for new entries
    this.noteSound = new Audio('assets/sounds/clue_unlock.wav');
    this.noteSound.volume = 0.7;
    this.noteSound.preload = 'auto';
  }

  init() {
    this.notes = [];
    this.page = 0;

    // Load saved notes from storage
    if (localStorage.getItem('directionsClue') === 'true') {
      this.notes.push({
        title: 'Secret Street Directions',
        text: 'N, E, S, S, S, W.'
      });
    }

    if (localStorage.getItem('note_dinerUnlocked') === 'true') {
      this.notes.push({
        title: 'Diner Lead',
        text: 'Sophie said the diner staff knows something. Meet the waitress there.'
      });
    }

    if (localStorage.getItem('note_napkinDirections') === 'true') {
      this.notes.push({
        title: 'Napkin Directions',
        text: 'Scribbled path: N, E, S, S, S, W. The grease stains feel intentional.'
      });
    }

    if (localStorage.getItem('note_keycardFound') === 'true') {
      this.notes.push({
        title: 'Keycard',
        text: 'A magnetic keycard pulled from a puddle in Secret Street. High-level clearance.'
      });
    }

    if (localStorage.getItem('note_meetAlexApartment') === 'true') {
      this.notes.push({
        title: 'Meet Alex at Apartment',
        text: 'Sam wants me to check on Alex at his apartment. Something felt urgent in her voice.'
      });
    }

    if (localStorage.getItem('note_dropObservatoryPackage') === 'true') {
      this.notes.push({
        title: 'Deliver Observatory Package',
        text: 'Take the sealed package to the Observatory assistant. No questions asked.'
      });
    }

    if (localStorage.getItem('note_alexCampsiteHint') === 'true') {
      this.notes.push({
        title: 'Campsite Lead',
        text: 'Assistant hinted Alex may have gone camping. Check the campsite for clues.'
      });
    }

    if (localStorage.getItem('note_fuseFound') === 'true') {
      this.notes.push({
        title: 'Fuse',
        text: 'Picked up a small fuse. Could fix dead electronics.'
      });
    }

    if (localStorage.getItem('note_matchesFound') === 'true') {
      this.notes.push({
        title: 'Matches',
        text: 'A book of matches. Might be useful for light—or something else.'
      });
    }

    if (localStorage.getItem('note_alexLabNotes') === 'true') {
      this.notes.push({
        title: 'Alex’s Lab Notes',
        text: 'Recovered Alex’s lab notes from his apartment. Sketches of containment seals and strange symbols.'
      });
    }

    if (localStorage.getItem('note_sewerDirections') === 'true') {
      this.notes.push({
        title: 'Sewer Directions',
        text: 'Clipboard note from the assistant: Cedar Ave → S, E, N, N, N, W.'
      });
    }

    if (localStorage.getItem('note_jukeboxSong') === 'true') {
      this.notes.push({
        title: 'Jukebox Song',
        text: 'Song identified: "Midnight Static" from the diner jukebox.'
      });
    }

    if (localStorage.getItem('note_matchbookExamined') === 'true') {
      this.notes.push({
        title: 'Matchbook Note',
        text: 'Inside the matchbook: a faint symbol and a phone number burned into the paper.'
      });
    }

    // Listen for live note additions
    window.addEventListener('notesUpdate', (evt) => {
      const note = evt.detail;

      // Prevent duplicate entries
      if (!this.notes.find(n => n.title === note.title)) {
        this.notes.push(note);
        this.page = Math.max(
          0,
          Math.ceil(this.notes.length / this.pageSize) - 1
        );
        this.noteSound.currentTime = 0;
        this.noteSound.play().catch(() => {});
      }
    });
  }

  render(ctx) {
    const panel = drawCenteredPanel(ctx, 'rgba(20,20,20,0.8)');

    drawTextCentered(ctx, 'NOTEBOOK', panel.y + 80);
    drawTextCentered(ctx, 'Press ESC to close', panel.y + panel.h - 50, '#aaa', 20);

    // If no notes yet
    if (this.notes.length === 0) {
      drawTextCentered(ctx, '(No Notes Yet)', panel.y + panel.h / 2, '#888', 22);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(this.notes.length / this.pageSize));
    this.page = Math.min(this.page, totalPages - 1);
    const start = this.page * this.pageSize;
    const end = Math.min(this.notes.length, start + this.pageSize);
    const visibleNotes = this.notes.slice(start, end);

    drawTextCentered(
      ctx,
      `Page ${this.page + 1}/${totalPages}`,
      panel.y + 110,
      '#aaa',
      18
    );

    // Display notes
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '22px "Pixel-Regular", monospace';

    let lineY = panel.y + 140;
    const marginX = panel.x + 60;

    visibleNotes.forEach(note => {
      // Title
      ctx.fillStyle = '#fff';
      ctx.fillText(note.title, marginX, lineY);
      lineY += 30;

      // Text
      ctx.font = '18px "Pixel-Regular", monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText(note.text, marginX + 20, lineY);
      lineY += 50;

      // Reset for next note
      ctx.font = '22px "Pixel-Regular", monospace';
    });

    if (totalPages > 1) {
      drawTextCentered(
        ctx,
        '←/→ to change page',
        panel.y + panel.h - 80,
        '#aaa',
        18
      );
    }
  }

  handleInput(e) {
    const key = e.key;
    if (key === 'Escape') {
      this.manager.overlay.hide();
      return;
    }

    const totalPages = Math.max(1, Math.ceil(this.notes.length / this.pageSize));
    if (totalPages > 1) {
      if (key === 'ArrowRight') {
        this.page = (this.page + 1) % totalPages;
        return;
      }
      if (key === 'ArrowLeft') {
        this.page = (this.page - 1 + totalPages) % totalPages;
        return;
      }
    }
  }
}
