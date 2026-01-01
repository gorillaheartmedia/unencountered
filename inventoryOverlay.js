// ---------- inventoryOverlay.js ----------
// Inventory with selectable items, verb menu, and examine panel
// ENHANCED:
// - Stateful Examine support
// - Matchbook opens on first examine, revealing secret image/text
// - Richer per-item examine descriptions
// - Fully engine-aligned (no hardcoded hacks)

import { getLayout } from './layout.js';
import { drawTextCentered, drawBox } from './ui.js';

export class InventoryOverlay {
  constructor(manager) {
    this.name = 'Inventory';
    this.manager = manager;

    this.items = [];
    this.mode = "list";
    this.selectedIndex = 0;
    this.selectedVerb = 0;

    this.verbs = ["Examine", "Use"];

    this.examineImage = null;

    // -------------------------------------------------------------
    // ITEM IMAGES (dynamic per state)
    // -------------------------------------------------------------
    this.itemImages = {
      "Keycard": () => "assets/keycard.png",
      "Sophie’s Napkin": () => "assets/napkin.png",
      "Observatory Package": () => "assets/observatory_package.png",

      // Matchbook is stateful
      "Matchbook": () =>
        localStorage.getItem("matchbookOpened") === "true"
          ? "assets/matchbook_open.png"
          : "assets/matchbook.png",

      "Crystal": () => "assets/crystal.png",
      "Fuse": () => "assets/fuse.png",
      "Apartment Key": () => "assets/key.png",
      "Alex’s Notes": () => "assets/alex_notes.png"
    };

    // -------------------------------------------------------------
    // Item-acquired sound
    // -------------------------------------------------------------
    this.inventorySound = new Audio("assets/sounds/inventory_add.wav");
    this.inventorySound.volume = 0.6;

    // -------------------------------------------------------------
    // GLOBAL LISTENER FOR INVENTORY UPDATES
    // -------------------------------------------------------------
    window.addEventListener('inventoryUpdate', (evt) => {
      if (!evt?.detail?.item) return;

      const itemName = evt.detail.item;

      if (!this.items.find(i => i.name === itemName)) {
        this.items.push({
          name: itemName,
          desc: this.getItemDescription(itemName)
        });

        this.inventorySound.currentTime = 0;
        this.inventorySound.play().catch(() => {});
      }

      const cleanKey =
        "inventory_" + itemName.replace(/[^\w]/g, "").toLowerCase();

      localStorage.setItem(cleanKey, "true");
    });
  }

  // -------------------------------------------------------------
  // Scene-type helper
  // -------------------------------------------------------------
  isInteractiveScene() {
    return this.manager.scene?.sceneType === "interactive";
  }

  // -------------------------------------------------------------
  // LOAD ITEMS FROM STORAGE
  // -------------------------------------------------------------
  init() {
    this.items = [];

    const push = (name) =>
      this.items.push({ name, desc: this.getItemDescription(name) });

    if (localStorage.getItem('inventory_napkin') === 'true') push("Sophie’s Napkin");
    if (localStorage.getItem('inventory_keycard') === 'true') push("Keycard");
    if (localStorage.getItem('inventory_observatorypackage') === 'true') push("Observatory Package");
    if (localStorage.getItem('inventory_matchbook') === 'true') push("Matchbook");
    if (localStorage.getItem('inventory_crystal') === 'true') push("Crystal");
    if (localStorage.getItem('inventory_apartmentkey') === 'true') push("Apartment Key");
    if (localStorage.getItem('inventory_fuse') === 'true') push("Fuse");
    if (localStorage.getItem('inventory_alexnotes') === 'true') push("Alex’s Notes");

    this.mode = "list";
    this.selectedIndex = 0;
    this.selectedVerb = 0;
  }

  // -------------------------------------------------------------
  // DESCRIPTION HANDLER (STATEFUL)
  // -------------------------------------------------------------
  getItemDescription(name) {
    switch (name) {
      case "Matchbook":
        if (localStorage.getItem("matchbookOpened") === "true") {
          return "Inside the matchbook: There are a set of numbers on the top flap.";
        }
        return "A matchbook. Alex must have dropped this.";

      case "Sophie’s Napkin":
        return "A diner napkin with handwritten directions. The grease stains feel deliberate.";

      case "Crystal":
        return "A translucent shard that bends light unnaturally. It feels warm despite the cold air.";

      case "Alex’s Notes":
        return "Alex’s research notes. The Observatory password uses the THIRD WORD of his favorite song. Scribbled beneath: ‘C-7’.";

      case "Keycard":
        return "A metallic access card pulled from a puddle. Still works. Somehow.";

      case "Fuse":
        return "A general-purpose equipment fuse. Recently removed.";

      case "Apartment Key":
        return "A worn apartment key. The teeth are uneven from heavy use.";

      case "Observatory Package":
        return "A sealed delivery package addressed to the Observatory. You haven’t opened it.";

      default:
        return "An item you collected.";
    }
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  render(ctx) {
    const { x, y, w, h } = getLayout(ctx.canvas.width, ctx.canvas.height);

    drawBox(ctx, x, y, w, h, 'rgba(0,0,0,0.75)', '#fff');
    drawTextCentered(ctx, 'INVENTORY', y + 80);
    drawTextCentered(ctx, 'Press ESC to close', y + h - 40, '#aaa', 20);

    if (this.items.length === 0) {
      drawTextCentered(ctx, '(Inventory Empty)', y + h / 2, '#888', 22);
      return;
    }

    if (this.mode === "list") this.renderItemList(ctx, x, y, w, h);
    if (this.mode === "verbs") this.renderVerbMenu(ctx, x, y, w, h);
    if (this.mode === "examine") this.renderExaminePanel(ctx, x, y, w, h);
  }

  renderItemList(ctx, x, y) {
    ctx.font = '24px "Pixel-Regular"';
    ctx.textAlign = 'left';

    let lineY = y + 160;
    this.items.forEach((item, i) => {
      ctx.fillStyle = i === this.selectedIndex ? '#ffff66' : '#fff';
      ctx.fillText(item.name, x + 80, lineY);
      lineY += 40;
    });
  }

  renderVerbMenu(ctx, x, y, w, h) {
    drawBox(ctx, x + w / 2 - 160, y + h / 2 - 110, 320, 220, 'rgba(0,0,0,0.85)');
    drawTextCentered(ctx, `"${this.items[this.selectedIndex].name}"`, y + h / 2 - 60, '#ffffaa', 24);
    drawTextCentered(ctx, 'Choose action:', y + h / 2 - 20, '#ddd', 20);

    ctx.font = '22px "Pixel-Regular"';
    this.verbs.forEach((verb, i) => {
      ctx.fillStyle = i === this.selectedVerb ? '#ffff66' : '#fff';
      ctx.fillText(verb, x + w / 2, y + h / 2 + 20 + i * 36);
    });
  }

  renderExaminePanel(ctx, x, y, w, h) {
    const item = this.items[this.selectedIndex];
    drawBox(ctx, x + 60, y + 160, w - 120, h - 260, 'rgba(0,0,0,0.85)');
    drawTextCentered(ctx, item.name, y + 200, '#ffffaa', 26);

    if (this.examineImage?.complete) {
      ctx.drawImage(this.examineImage, x + w / 2 - 100, y + 240, 200, 200);
    }

    ctx.font = '20px "Pixel-Regular"';
    ctx.fillStyle = '#ddd';
    ctx.textAlign = 'center';
    ctx.fillText(item.desc, x + w / 2, y + 470);

    drawTextCentered(ctx, 'Press ENTER or ESC to return', y + h - 120, '#aaa', 18);
  }

  // -------------------------------------------------------------
  // INPUT
  // -------------------------------------------------------------
  handleInput(e) {
    const key = e.key.toLowerCase();

    this.verbs = this.isInteractiveScene() ? ["Examine", "Use"] : ["Examine"];

    if (this.mode === "examine") {
      if (key === "enter" || key === "escape") this.mode = "list";
      return;
    }

    if (this.mode === "verbs") {
      if (key === "escape") this.mode = "list";
      if (key === "arrowup") this.selectedVerb = (this.selectedVerb + this.verbs.length - 1) % this.verbs.length;
      if (key === "arrowdown") this.selectedVerb = (this.selectedVerb + 1) % this.verbs.length;
      if (key === "enter") this.executeVerb(this.verbs[this.selectedVerb]);
      return;
    }

    if (this.mode === "list") {
      if (key === "escape") return this.manager.overlay.hide();
      if (key === "arrowup") this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length;
      if (key === "arrowdown") this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      if (key === "enter") this.mode = "verbs";
    }
  }

  // -------------------------------------------------------------
  // VERB EXECUTION
  // -------------------------------------------------------------
  executeVerb(verb) {
    const item = this.items[this.selectedIndex];
    if (!item) return;

    if (verb === "Examine") {
      if (item.name === "Matchbook" && !localStorage.getItem("matchbookOpened")) {
        localStorage.setItem("matchbookOpened", "true");
        item.desc = this.getItemDescription("Matchbook");

        // Notebook entry when the matchbook is opened
        if (!localStorage.getItem("note_matchbookExamined")) {
          localStorage.setItem("note_matchbookExamined", "true");
          window.dispatchEvent(
            new CustomEvent("notesUpdate", {
              detail: {
                title: "Matchbook Note",
                text: "Inside the matchbook: There are a set of numbers on the top flap."
              }
            })
          );
        }
      }

      this.examineImage = new Image();
      this.examineImage.src = this.itemImages[item.name]();
      this.mode = "examine";
    }

    if (verb === "Use") {
      window.dispatchEvent(new CustomEvent("inventoryUse", { detail: { item: item.name } }));
      this.mode = "list";
    }
  }
}
