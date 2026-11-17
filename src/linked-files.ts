import { readDescriptor, type Descriptor } from './descriptor.ts';
import type { Reader } from './reader.ts';

const TYPES = { liFD: 'embedded', liFE: 'external', liFA: 'alias' } as const;

/** A file placed in the document as a smart object, from the `lnk2`, `lnk3`, `lnkD` or `lnkE` blocks. */
export interface LinkedFile {
  /** The unique ID that smart object layers refer to in `info.placedLayer.Idnt`. */
  id: string;
  /** The original file name. */
  name: string;
  /** Whether the file is embedded in the document, or a link to an external file or alias. */
  type: (typeof TYPES)[keyof typeof TYPES];
  /** The file type code, such as `'8BPB'` for PSD and PSB or `'png '`. Can be empty. */
  fileType: string;
  /** The creator code. Can be empty. */
  creator: string;
  version: number;
  /**
   * The file contents, for embedded files and external files that store a copy. Embedded PSD and
   * PSB files can be opened with `new PSD(data)`.
   */
  data?: Uint8Array;
  /** For external files: where the file was, with keys such as `fullPath`, `relPath` and `originalPath`. */
  location?: Descriptor;
}

/** Reads the linked files in a `lnk2`, `lnk3`, `lnkD` or `lnkE` block. The data is a view into the file, not a copy. */
export function readLinkedFiles(r: Reader, end: number): LinkedFile[] {
  const files: LinkedFile[] = [];
  // Each file is a length-prefixed record padded to 4 bytes. Some blocks end with padding too short to hold one.
  while (r.pos + 8 <= end) {
    const length = r.int64();
    const next = r.pos + ((length + 3) & ~3);
    if (r.pos + length > end) throw new Error(`Linked file of ${length} bytes overruns its block`);

    const key = r.ascii(4);
    const type = TYPES[key as keyof typeof TYPES];
    if (!type) throw new Error(`Unknown linked file type '${key}'`);
    const version = r.uint32();
    const id = r.pascal();
    const name = r.unicode();
    const fileType = r.ascii(4);
    const creator = r.ascii(4);
    const dataLength = r.int64();
    if (r.bool()) {
      r.skip(4); // descriptor version
      readDescriptor(r); // open file descriptor
    }

    const file: LinkedFile = { id, name, type, fileType, creator, version };
    if (type === 'external') {
      r.skip(4); // descriptor version
      file.location = readDescriptor(r);
      if (version > 3) r.skip(16); // modification time: year (4), month, day, hour, minute (1 each), seconds (8)
      r.skip(8); // the external file's size
      if (version >= 2 && dataLength > 0) file.data = r.bytesView(dataLength);
    } else if (type === 'embedded') {
      file.data = r.bytesView(dataLength);
    }
    // Version 5+ fields (child document ID, modification time, lock state) aren't read.
    files.push(file);
    r.seek(next);
  }
  return files;
}
