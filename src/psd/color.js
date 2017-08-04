import { clamp } from './util'

function cmykToRgb(c, m, y, k) {
  const r = clamp((65535 - (c * (255 - k) + (k << 8))) >> 8, 0, 255);
  const g = clamp((65535 - (m * (255 - k) + (k << 8))) >> 8, 0, 255);
  const b = clamp((65535 - (y * (255 - k) + (k << 8))) >> 8, 0, 255);
  return [r, g, b];
}

export {
  cmykToRgb
}
