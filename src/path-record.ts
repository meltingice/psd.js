import type { Reader } from './reader.ts';

export interface PathPoint {
  vert: number;
  horiz: number;
}

/** One 26-byte record of a vector path (vector masks, saved paths, the work path). */
export type PathRecord =
  | {
      /** 0 starts a closed subpath, 3 an open one. */
      recordType: 0 | 3;
      numPoints: number;
      /**
       * How this subpath combines with the shape built from the ones before it. Undocumented by Adobe:
       * 1 combine (union), 2 subtract, 3 intersect, 0 exclude (xor), and -1 for a subpath that belongs
       * to the same component as the previous one, like the inner contour of a ring.
       */
      operation: number;
    }
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
      record = { recordType, numPoints: r.int16(), operation: r.int16() };
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

/**
 * Converts path records (`vectorMask.paths`, `workPath`, `savedPaths[].records`) to SVG path data, with one
 * entry per shape component. Knot coordinates are fractions of the document size, so pass `psd.width` and
 * `psd.height` to get document pixels.
 *
 * Fill each component with the even-odd rule. Photoshop then combines the components in order, starting
 * from an empty canvas (or a full one if the first operation is subtract or intersect), by `operation`:
 * 1 combine (union), 2 subtract, 3 intersect, 0 exclude (xor). The subpaths of one component, such as the
 * two contours of a ring, share a `d`.
 *
 * Every knot becomes a cubic Bézier; closed subpaths end in `Z` and open ones don't. Other records,
 * including the initial fill (8), are ignored. Throws if the knots don't match their subpath records.
 *
 * @example
 * const [shape] = pathToSvg(node.info.vectorMask.paths, psd.width, psd.height);
 * `<svg viewBox="0 0 ${psd.width} ${psd.height}"><path fill-rule="evenodd" d="${shape.d}"/></svg>`;
 */
export function pathToSvg(records: readonly PathRecord[], width: number, height: number): { operation: number; d: string }[] {
  const num = (n: number) => String(Math.round(n * 1000) / 1000 + 0); // + 0 turns -0 into 0
  const xy = (p: PathPoint) => `${num(p.horiz * width)} ${num(p.vert * height)}`;
  type Knot = Extract<PathRecord, { anchor: PathPoint }>;
  const subpaths: { closed: boolean; operation: number; numPoints: number; knots: Knot[] }[] = [];

  records.forEach((record, i) => {
    if (record.recordType === 0 || record.recordType === 3) {
      subpaths.push({ closed: record.recordType === 0, operation: record.operation, numPoints: record.numPoints, knots: [] });
    } else if ('anchor' in record) {
      const subpath = subpaths.at(-1);
      if (!subpath || subpath.knots.length === subpath.numPoints || subpath.closed !== record.closed) {
        throw new Error(`Path record ${i} is a knot outside of a ${record.closed ? 'closed' : 'open'} subpath`);
      }
      subpath.knots.push(record);
    }
  });

  const components: { operation: number; d: string }[] = [];
  for (const { closed, operation, numPoints, knots } of subpaths) {
    if (knots.length !== numPoints) throw new Error(`Subpath has ${knots.length} of its ${numPoints} knots`);
    let d = '';
    if (knots.length) {
      const segments = knots.slice(1).map((k, i) => `C${xy(knots[i]!.leaving)} ${xy(k.preceding)} ${xy(k.anchor)}`);
      if (closed) segments.push(`C${xy(knots.at(-1)!.leaving)} ${xy(knots[0]!.preceding)} ${xy(knots[0]!.anchor)}Z`);
      d = `M${xy(knots[0]!.anchor)}${segments.join('')}`;
    }
    if (operation !== -1) components.push({ operation, d });
    else if (components.length) components.at(-1)!.d += d;
    else throw new Error('The first subpath continues a shape component that does not exist');
  }
  return components;
}
