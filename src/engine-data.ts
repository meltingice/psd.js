/**
 * Parses the PostScript-like "EngineData" format Photoshop uses for text layers, e.g.
 * `<< /Key (string) /List [ 1 .5 true ] /Dict << /Name /Value >> >>`.
 * Strings are byte strings with `\` escapes, and are UTF-16BE when they start with a BOM.
 */
export type EngineValue = string | number | boolean | EngineValue[] | EngineDict;
export interface EngineDict {
  [key: string]: any;
}

const utf16 = new TextDecoder('utf-16be');
const isSpace = (b: number) => b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d || b === 0x00;
const isDelimiter = (b: number) => isSpace(b) || b === 0x2f || b === 0x5b || b === 0x5d || b === 0x3c || b === 0x3e || b === 0x28;

export function parseEngineData(bytes: Uint8Array): EngineDict {
  let pos = 0;

  const skipSpace = () => {
    while (pos < bytes.length && isSpace(bytes[pos]!)) pos++;
  };

  const word = () => {
    const start = pos;
    while (pos < bytes.length && !isDelimiter(bytes[pos]!)) pos++;
    return String.fromCharCode(...bytes.subarray(start, pos));
  };

  const string = () => {
    pos++; // (
    const out: number[] = [];
    for (;;) {
      if (pos >= bytes.length) throw new Error('Unterminated EngineData string');
      const b = bytes[pos++]!;
      if (b === 0x29) break; // )
      out.push(b === 0x5c ? bytes[pos++]! : b); // \ escapes the next byte
    }
    if (out[0] === 0xfe && out[1] === 0xff) return utf16.decode(new Uint8Array(out.slice(2)));
    return String.fromCharCode(...out);
  };

  const value = (): EngineValue => {
    skipSpace();
    const b = bytes[pos];
    if (b === 0x3c && bytes[pos + 1] === 0x3c) {
      pos += 2;
      const dict: EngineDict = {};
      for (;;) {
        skipSpace();
        if (bytes[pos] === 0x3e && bytes[pos + 1] === 0x3e) {
          pos += 2;
          return dict;
        }
        if (bytes[pos] !== 0x2f) throw new Error(`Expected EngineData key at offset ${pos}`);
        pos++;
        dict[word()] = value();
      }
    }
    if (b === 0x5b) {
      pos++;
      const list: EngineValue[] = [];
      for (;;) {
        skipSpace();
        if (bytes[pos] === 0x5d) {
          pos++;
          return list;
        }
        list.push(value());
      }
    }
    if (b === 0x28) return string();
    if (b === 0x2f) {
      pos++;
      return word();
    }
    const token = word();
    if (token === 'true') return true;
    if (token === 'false') return false;
    const n = Number(token);
    if (token === '' || Number.isNaN(n)) throw new Error(`Unexpected EngineData token '${token}' at offset ${pos}`);
    return n;
  };

  const root = value();
  if (typeof root !== 'object' || Array.isArray(root)) throw new Error('EngineData root is not a dictionary');
  return root;
}
