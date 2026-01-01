// ---------- ui.js ----------
// shared drawing utilities for Unencountered v2
export const COLORS = {
  white: '#ffffff',
  black: '#000000',
  gray: '#aaaaaa',
  accent: '#66f'
};

// draw centered text
export function drawTextCentered(ctx, text, y, color = '#fff', fontSize = 36) {
  ctx.font = `${fontSize}px "Pixel-Regular", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, ctx.canvas.width / 2, y);
}

// draw outlined text box / panel background
export function drawBox(ctx, x, y, w, h, fill = 'rgba(0,0,0,0.82)', stroke = '#fff') {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// draw a standard centered panel (90% width × 80% height)
export function drawCenteredPanel(ctx, color = 'rgba(0,0,0,0.65)') {
  const bw = Math.floor(ctx.canvas.width * 0.9);
  const bh = Math.floor(ctx.canvas.height * 0.8);
  const bx = (ctx.canvas.width - bw) / 2;
  const by = (ctx.canvas.height - bh) / 2;
  drawBox(ctx, bx, by, bw, bh, color);
  return { x: bx, y: by, w: bw, h: bh };
}

// corner banner
export function flashBanner(text = 'Office', ms = 2000) {
  const el = document.createElement('div');
  el.className = 'corner-banner';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, ms);
}

// ---------- key hint bar ----------
export function drawKeyBar(ctx) {
  const keys = [
    { num: '1', label: 'Phone' },
    { num: '2', label: 'Notebook' },
    { num: '3', label: 'Map' },
    { num: '4', label: 'Inventory' }
  ];

  const H = ctx.canvas.height;
  const boxH = 46;
  const gap = 18;
  const startY = H - boxH - 18;

  const totalWidth = keys.length * 120 + (keys.length - 1) * gap;
  const startX = (ctx.canvas.width - totalWidth) / 2;

  keys.forEach((k, i) => {
    const x = startX + i * (120 + gap);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fillRect(x, startY, 120, boxH);
    ctx.strokeRect(x, startY, 120, boxH);

    ctx.font = '20px "Pixel-Regular", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${k.num}: ${k.label}`, x + 60, startY + boxH / 2 + 1);
  });
}
