/** Pixel data with 1 (grayscale) or 4 (RGBA) bytes per pixel. Compatible with `ImageData`. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

const transform = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream)).arrayBuffer());

export const inflate = (bytes: Uint8Array) => transform(bytes, new DecompressionStream('deflate'));
export const deflate = (bytes: Uint8Array) => transform(bytes, new CompressionStream('deflate'));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Encodes 8-bit grayscale or RGBA pixels as a PNG file. */
export async function encodePng({ width, height, data }: Pixels): Promise<Uint8Array> {
  if (width === 0 || height === 0) throw new Error('Cannot encode an empty image as PNG');
  const channels = data.length / (width * height);
  if (channels !== 1 && channels !== 4) throw new Error(`Expected 1 or 4 bytes per pixel, got ${channels}`);

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = channels === 4 ? 6 : 0; // RGBA or grayscale

  // Each row is prefixed with filter type 0 (none).
  const rowLength = width * channels;
  const raw = new Uint8Array((rowLength + 1) * height);
  for (let y = 0; y < height; y++) raw.set(data.subarray(y * rowLength, (y + 1) * rowLength), y * (rowLength + 1) + 1);

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', await deflate(raw)),
    chunk('IEND', new Uint8Array()),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    png.set(p, offset);
    offset += p.length;
  }
  return png;
}
