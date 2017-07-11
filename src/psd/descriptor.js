// A descriptor is a block of data that describes a complex data structure of some kind.
// It was added sometime around Photoshop 5.0 and it superceded a few legacy things such
// as layer names and type data. The benefit of the Descriptor is that it is self-contained,
// and allows us to dynamically define data of any size. It's always represented by an Object
// at the root.
export default class Descriptor {
  constructor(file) {
    this.file = file;
    this.data = {};
  }

  parse() {
    this.data.class = this.parseClass();
    const numItems = this.file.readInt();

    for (var i = 0; i < numItems; i++) {
      const { id, value } = this.parseKeyItem();
      this.data[id] = value;
    }

    return this.data;
  }

  parseClass() {
    const name = this.file.readUnicodeString();
    const id = this.parseId();
    return { name, id }
  }

  parseId() {
    const len = this.file.readInt();
    return this.file.readString(len === 0 ? 4 : len);
  }

  parseKeyItem() {
    const id = this.parseId();
    const value = this.parseItem();
    return { id, value };
  }

  parseItem(type = null) {
    if (!type) type = this.file.readString(4);

    switch (type) {
      case 'bool':
        return this.parseBoolean();
      case 'type':
      case 'GlbC':
        return this.parseClass();
      case 'Objc':
      case 'GlbO':
        return new Descriptor(this.file).parse();
      case 'doub':
        return this.parseDouble();
      case 'enum':
        return this.parseEnum();
      case 'alis':
        return this.parseAlias();
      case 'Pth':
        return this.parseFilePath();
      case 'long':
        return this.parseInteger();
      case 'comp':
        return this.parseLargeInteger();
      case 'VlLs':
        return this.parseList();
      case 'ObAr':
        return this.parseObjectArray();
      case 'tdta':
        return this.parseRawData();
      case 'obj ':
        return this.parseReference();
      case 'TEXT':
        return this.file.readUnicodeString();
      case 'UntF':
        return this.parseUnitDouble();
      case 'UnFl':
        return this.parseUnitFloat();
    }
  }

  parseBoolean() {
    return this.file.readBoolean();
  }

  parseDouble() {
    return this.file.readDouble();
  }

  parseInteger() {
    return this.file.readInt();
  }

  parseLargeInteger() {
    return this.file.readLongLong();
  }

  parseIdentifier() {
    return this.file.readInt();
  }

  parseIndex() {
    return this.file.readInt();
  }

  parseOffset() {
    return this.file.readInt();
  }

  parseProperty() {
    const klass = this.parseClass();
    const id = this.parseId();

    return { class: klass, id };
  }

  parseEnum() {
    const type = this.parseId();
    const value = this.parseId();
    return { type, value };
  }

  parseEnumReference() {
    const klass = this.parseClass();
    const type = this.parseId();
    const value = this.parseId();
    return { class: klass, type, value };
  }

  parseAlias() {
    const len = this.file.readInt();
    return this.file.readString();
  }

  parseFilePath() {
    const len = this.file.readInt();
    const sig = this.file.readString(4);

    // Little endian. Who knows, man.
    const pathSize = this.file.read('<i');
    const numChars = this.file.read('<i');

    const path = this.file.readUnicodeString(numChars);
    return { sig, path };
  }

  parseList() {
    const count = this.file.readInt();
    let items = [];

    for (var i = 0; i < count; i++) {
      items.push(this.parseItem());
    }

    return items;
  }

  // Not documented anywhere and unsure of the data format. Luckily, this
  // type is extremely rare. In fact, it's so rare, that I've never run into it
  // among any of my PSDs.
  parseObjectArray() {
    throw `Descriptor object array not implemented yet. Found at ${this.file.tell()}.`
  }

  parseRawData() {
    const len = this.file.readInt();
    return this.file.read(len);
  }

  parseReference() {
    const numItems = this.file.readInt();
    let type, value, items = [];

    for (var i = 0; i < numItems; i++) {
      type = this.file.readString(4);
      switch (type) {
        case 'prop': value = this.parseProperty(); break;
        case 'Clss': value = this.parseClass(); break;
        case 'Enmr': value = this.parseEnumReference(); break;
        case 'Idnt': value = this.parseIdentifier(); break;
        case 'indx': value = this.parseIndex(); break;
        case 'name': value = this.file.readUnicodeString(); break;
        case 'rele': value = this.parseOffset(); break;
      }

      items.push({ type, value });
    }

    return items;
  }

  parseUnitDouble() {
    const unitId = this.file.readString(4)
    let unit;
    switch (unitId) {
      case '#Ang': unit = 'Angle'; break;
      case '#Rsl': unit = 'Density'; break;
      case '#Rlt': unit = 'Distance'; break;
      case '#Nne': unit = 'None'; break;
      case '#Prc': unit = 'Percent'; break;
      case '#Pxl': unit = 'Pixels'; break;
      case '#Mlm': unit = 'Millimeters'; break;
      case '#Pnt': unit = 'Points'; break;
    }

    value = this.file.readDouble();
    return { id: unitId, unit, value };
  }

  parseUnitFloat() {
    const unitId = this.file.readString(4)
    let unit;
    switch (unitId) {
      case '#Ang': unit = 'Angle'; break;
      case '#Rsl': unit = 'Density'; break;
      case '#Rlt': unit = 'Distance'; break;
      case '#Nne': unit = 'None'; break;
      case '#Prc': unit = 'Percent'; break;
      case '#Pxl': unit = 'Pixels'; break;
      case '#Mlm': unit = 'Millimeters'; break;
      case '#Pnt': unit = 'Points'; break;
    }

    value = this.file.readFloat();
    return { id: unitId, unit, value };
  }
}
