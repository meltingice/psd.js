export function pad2(i) {
  return (i + 1) & ~0x01;
}

export function pad4(i) {
  return ((i + 4) & ~0x03) - 1;
}
