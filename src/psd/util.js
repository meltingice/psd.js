export function pad2(i) {
  return (i + 1) & ~0x01;
}

export function pad4(i) {
  return ((i + 4) & ~0x03) - 1;
}

export function clamp(num, min, max) {
  if (num < min) return min;
  if (num > max) return max;
  return num;
}
