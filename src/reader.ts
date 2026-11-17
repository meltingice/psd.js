const utf16 = new TextDecoder('utf-16be');

/** A big-endian cursor over the PSD bytes. Cheap to create, so lazy sections each get their own. */
export class Reader {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  pos: number;

  constructor(bytes: Uint8Array, pos = 0) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = pos;
  }

  /** A new reader over the same bytes, positioned at `pos`. */
  at(pos: number): Reader {
    return new Reader(this.bytes, pos);
  }

  seek(pos: number): void {
    this.pos = pos;
  }

  skip(n: number): void {
    this.pos += n;
  }

  uint8(): number {
    return this.view.getUint8(this.pos++);
  }

  int8(): number {
    return this.view.getInt8(this.pos++);
  }

  bool(): boolean {
    return this.uint8() !== 0;
  }

  int16(): number {
    const v = this.view.getInt16(this.pos);
    this.pos += 2;
    return v;
  }

  uint16(): number {
    const v = this.view.getUint16(this.pos);
    this.pos += 2;
    return v;
  }

  int32(): number {
    const v = this.view.getInt32(this.pos);
    this.pos += 4;
    return v;
  }

  uint32(): number {
    const v = this.view.getUint32(this.pos);
    this.pos += 4;
    return v;
  }

  /** 64-bit integer as a Number. Exact up to 2^53, which covers any real file offset. */
  int64(): number {
    const v = Number(this.view.getBigInt64(this.pos));
    this.pos += 8;
    return v;
  }

  float32(): number {
    const v = this.view.getFloat32(this.pos);
    this.pos += 4;
    return v;
  }

  float64(): number {
    const v = this.view.getFloat64(this.pos);
    this.pos += 8;
    return v;
  }

  /** A zero-copy view of the next `n` bytes. */
  bytesView(n: number): Uint8Array {
    if (this.pos + n > this.bytes.length) throw new RangeError(`Read of ${n} bytes at ${this.pos} is out of bounds`);
    const v = this.bytes.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }

  /** A single-byte (Latin-1) string with NUL characters removed. */
  ascii(n: number): string {
    return String.fromCharCode(...this.bytesView(n)).replaceAll('\0', '');
  }

  /** A Pascal string: a length byte followed by that many characters. */
  pascal(): string {
    return this.ascii(this.uint8());
  }

  /** A UTF-16BE string of `length` code units, read from a leading uint32 when omitted. */
  unicode(length = this.uint32()): string {
    return utf16.decode(this.bytesView(length * 2)).replaceAll('\0', '');
  }

  /** Signed 8.24 fixed-point number used by path records. */
  pathNumber(): number {
    return this.int32() / (1 << 24);
  }

  /** A color space ID followed by four 16-bit components (reduced to 8 bits). */
  spaceColor(): SpaceColor {
    const colorSpace = this.int16();
    const components = [0, 0, 0, 0].map(() => this.uint16() >> 8);
    return { colorSpace, components };
  }
}

export interface SpaceColor {
  colorSpace: number;
  components: number[];
}

/** Rounds up to an even number. */
export const pad2 = (n: number) => (n + 1) & ~1;
