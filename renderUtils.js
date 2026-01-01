// ---------- renderUtils.js ----------
// Universal rendering helpers for Unencountered scenes
// Ensures consistent 16:9 scaling and clean visual transitions

/**
 * Draws an image scaled to fit a 16:9 frame,
 * centered on screen without distortion.
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {HTMLImageElement} img 
 * @param {HTMLCanvasElement} canvas 
 */
export function drawSceneImage(ctx, img, canvas) {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const BASE_W = 1920, BASE_H = 1080;
  const scale = Math.min(canvas.width / BASE_W, canvas.height / BASE_H);
  const drawW = BASE_W * scale;
  const drawH = BASE_H * scale;
  const dx = (canvas.width - drawW) / 2;
  const dy = (canvas.height - drawH) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

/**
 * Draws a fade overlay — pass alpha from 0 to 1
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} alpha 
 * @param {string} color 
 */
export function fadeOverlay(ctx, alpha = 1, color = '#000') {
  if (alpha <= 0) return;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  ctx.fillRect(0, 0, W, H);
}

/**
 * (Optional) Parallax background renderer for layered motion.
 * Each layer = { img, speed, offset }
 * Example usage in a scene:
 *    drawParallaxScene(ctx, layers, cameraX);
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Array} layers 
 * @param {number} cameraX 
 */
export function drawParallaxScene(ctx, layers, cameraX = 0) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.imageSmoothingEnabled = false;

  for (const layer of layers) {
    if (!layer.img || !layer.img.complete) continue;
    const imgW = layer.img.width;
    const imgH = layer.img.height;
    const scale = Math.max(W / imgW, H / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = ((-cameraX * layer.speed) % drawW);
    for (let x = dx - drawW; x < W; x += drawW) {
      ctx.drawImage(layer.img, x, 0, drawW, drawH);
    }
  }
}
