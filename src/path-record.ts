import type { Reader } from './reader.ts';

export interface PathPoint {
  vert: number;
  horiz: number;
}

/** One 26-byte record of a vector path (vector masks, saved paths, the work path). */
export type PathRecord =
  | { recordType: 0 | 3; numPoints: number }
  | {
      recordType: 1 | 2 | 4 | 5;
      /** Closed subpath records are 1 and 2; open are 4 and 5. */
      closed: boolean;
      linked: boolean;
      preceding: PathPoint;
      anchor: PathPoint;
      leaving: PathPoint;
    }
  | { recordType: 6 }
  | { recordType: 7; clipboard: { top: number; left: number; bottom: number; right: number; resolution: number } }
  | { recordType: 8; initialFill: number };

export function readPathRecords(r: Reader, count: number): PathRecord[] {
  return Array.from({ length: count }, () => readPathRecord(r));
}

function readPathRecord(r: Reader): PathRecord {
  const start = r.pos;
  const recordType = r.int16();
  let record: PathRecord;
  const point = () => ({ vert: r.pathNumber(), horiz: r.pathNumber() });

  switch (recordType) {
    case 0:
    case 3:
      record = { recordType, numPoints: r.int16() };
      break;
    case 1:
    case 2:
    case 4:
    case 5:
      record = {
        recordType,
        closed: recordType <= 2,
        linked: recordType === 1 || recordType === 4,
        preceding: point(),
        anchor: point(),
        leaving: point(),
      };
      break;
    case 7: {
      const [top, left, bottom, right, resolution] = [0, 0, 0, 0, 0].map(() => r.pathNumber()) as [number, number, number, number, number];
      record = { recordType, clipboard: { top, left, bottom, right, resolution } };
      break;
    }
    case 8:
      record = { recordType, initialFill: r.int16() };
      break;
    case 6:
      record = { recordType };
      break;
    default:
      throw new Error(`Unknown path record type ${recordType} at offset ${start}`);
  }

  r.seek(start + 26);
  return record;
}
