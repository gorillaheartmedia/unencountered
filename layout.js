export function getLayout(W, H) {
  const bw = Math.floor(W * 0.9);
  const bh = Math.floor(H * 0.8);
  const bx = (W - bw) / 2;
  const by = (H - bh) / 2;
  return { x: bx, y: by, w: bw, h: bh, centerX: W / 2, centerY: H / 2 };
}
