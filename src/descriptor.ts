import type { Reader } from './reader.ts';

/**
 * Descriptors are Photoshop's self-describing key/value structures (the "Action Descriptor"
 * format). Their contents vary by block and Photoshop version, so values are typed loosely.
 */
export interface Descriptor {
  class: DescriptorClass;
  [key: string]: any;
}

export interface DescriptorClass {
  name: string;
  id: string;
}

export interface UnitValue {
  id: string;
  unit: string | undefined;
  value: number;
}

const UNITS: Record<string, string> = {
  '#Ang': 'Angle',
  '#Rsl': 'Density',
  '#Rlt': 'Distance',
  '#Nne': 'None',
  '#Prc': 'Percent',
  '#Pxl': 'Pixels',
  '#Mlm': 'Millimeters',
  '#Pnt': 'Points',
};

export function readDescriptor(r: Reader): Descriptor {
  const data: Descriptor = { class: readClass(r) };
  const count = r.int32();
  for (let i = 0; i < count; i++) {
    const key = readId(r);
    data[key] = readItem(r, r.ascii(4));
  }
  return data;
}

function readClass(r: Reader): DescriptorClass {
  return { name: r.unicode(), id: readId(r) };
}

function readId(r: Reader): string {
  const len = r.int32();
  return r.ascii(len === 0 ? 4 : len);
}

function readItem(r: Reader, type: string): unknown {
  switch (type) {
    case 'bool':
      return r.bool();
    case 'type':
    case 'GlbC':
      return readClass(r);
    case 'Objc':
    case 'GlbO':
      return readDescriptor(r);
    case 'doub':
      return r.float64();
    case 'enum':
      return { type: readId(r), value: readId(r) };
    case 'alis':
      return r.ascii(r.int32());
    case 'Pth ': {
      r.skip(4); // length
      const sig = r.ascii(4);
      r.skip(4); // path size, little endian
      const chars = r.view.getInt32(r.pos, true);
      r.skip(4);
      return { sig, path: r.unicode(chars) };
    }
    case 'long':
      return r.int32();
    case 'comp':
      return r.int64();
    case 'VlLs': {
      const count = r.int32();
      return Array.from({ length: count }, () => readItem(r, r.ascii(4)));
    }
    case 'tdta':
      return r.bytesView(r.int32());
    case 'obj ':
      return readReference(r);
    case 'TEXT':
      return r.unicode();
    case 'UntF':
      return readUnit(r, () => r.float64());
    case 'UnFl': {
      // A unit followed by a list of doubles. Only seen inside object arrays.
      const id = r.ascii(4);
      const count = r.int32();
      return { id, unit: UNITS[id], values: Array.from({ length: count }, () => r.float64()) };
    }
    default:
      // Includes 'ObAr' (object array), which is undocumented. Unknown types would desync the
      // reader, so fail loudly instead of returning garbage.
      throw new Error(`Unsupported descriptor item type '${type}' at offset ${r.pos - 4}`);
  }
}

function readUnit(r: Reader, read: () => number): UnitValue {
  const id = r.ascii(4);
  return { id, unit: UNITS[id], value: read() };
}

function readReference(r: Reader): Array<{ type: string; value: unknown }> {
  const count = r.int32();
  const items = [];
  for (let i = 0; i < count; i++) {
    const type = r.ascii(4);
    let value: unknown;
    switch (type) {
      case 'prop':
        value = { class: readClass(r), id: readId(r) };
        break;
      case 'Clss':
        value = readClass(r);
        break;
      case 'Enmr':
        value = { class: readClass(r), type: readId(r), value: readId(r) };
        break;
      case 'Idnt':
      case 'indx':
      case 'rele':
        value = r.int32();
        break;
      case 'name':
        value = r.unicode();
        break;
      default:
        throw new Error(`Unsupported descriptor reference type '${type}' at offset ${r.pos - 4}`);
    }
    items.push({ type, value });
  }
  return items;
}
