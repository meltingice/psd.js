/** Pixel data with 1 (grayscale) or 4 (RGBA) bytes per pixel. Compatible with `ImageData`. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

/** Writes the chunks to a (de)compression stream as they're produced and returns its output chunks. */
async function transform(input: Iterable<Uint8Array>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array[]> {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const output: Uint8Array[] = [];
  const write = async () => {
    for (const bytes of input) await writer.write(bytes as Uint8Array<ArrayBuffer>);
    await writer.close();
  };
  const read = async () => {
    for (let r = await reader.read(); !r.done; r = await reader.read()) output.push(r.value);
  };
  await Promise.all([write(), read()]);
  return output;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export const inflate = async (bytes: Uint8Array) => concat(await transform([bytes], new DecompressionStream('deflate')));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function crc32(parts: Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const bytes of parts) for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** A PNG chunk as a list of parts, so large data isn't copied until the file is assembled. */
function chunk(type: string, data: Uint8Array[]): Uint8Array[] {
  const head = new Uint8Array(8);
  new DataView(head.buffer).setUint32(0, data.reduce((n, d) => n + d.length, 0));
  for (let i = 0; i < 4; i++) head[4 + i] = type.charCodeAt(i);
  const crc = new Uint8Array(4);
  new DataView(crc.buffer).setUint32(0, crc32([head.subarray(4), ...data]));
  return [head, ...data, crc];
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

  // Each row is prefixed with filter type 0 (none). Rows are compressed about 1MB at a time
  // rather than copied into one buffer, which would double the image's memory.
  const rowLength = width * channels;
  const blockRows = Math.max(1, Math.floor(2 ** 20 / (rowLength + 1)));
  function* rows() {
    for (let start = 0; start < height; start += blockRows) {
      const count = Math.min(blockRows, height - start);
      const block = new Uint8Array((rowLength + 1) * count);
      for (let y = 0; y < count; y++) {
        const row = (start + y) * rowLength;
        block.set(data.subarray(row, row + rowLength), y * (rowLength + 1) + 1);
      }
      yield block;
    }
  }

  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ...chunk('IHDR', [header]),
    ...chunk('IDAT', await transform(rows(), new CompressionStream('deflate'))),
    ...chunk('IEND', []),
  ]);
}
