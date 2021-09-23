/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// A descriptor is a block of data that describes a complex data structure of some kind.
// It was added sometime around Photoshop 5.0 and it superceded a few legacy things such
// as layer names and type data. The benefit of the Descriptor is that it is self-contained,
// and allows us to dynamically define data of any size. It's always represented by an Object
// at the root.
let Descriptor;
module.exports = (Descriptor = class Descriptor {
  // Creates a new Descriptor.
  constructor(file) {
    // The object that will store the resulting data.
    this.file = file;
    this.data = {};
  }

  // Parses the Descriptor at the current location in the file.
  parse() {
    this.data.class = this.parseClass();

    // The descriptor defines the number of items it contains at the root.
    const numItems = this.file.readInt();

    // Each item consists of a key/value combination, which is why our
    // descriptor is stored as an object instead of an array at the root.
    for (let i = 0, end = numItems, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      const [id, value] = Array.from(this.parseKeyItem());
      this.data[id] = value;
    }

    return this.data;
  }

  // ## Note
  // The rest of the methods in this class are considered private. You will never
  // call any of them from outside this class.

  // Parses a class representation, which consists of a name and a unique ID.
  parseClass() {
    return {
      name: this.file.readUnicodeString(),
      id: this.parseId()
    };
  }

  // Parses an ID, which is a unique String.
  parseId() {
    const len = this.file.readInt();
    if (len === 0) { return this.file.readString(4); } else { return this.file.readString(len); }
  }

  // Parses a key/item value, which consists of an ID and an Item of any type.
  parseKeyItem() {
    const id = this.parseId();
    const value = this.parseItem();
    return [id, value];
  }

  // Parses an Item, which can be one of many types of data, depending on the key.
  parseItem(type = null) {
    if (type == null) { type = this.file.readString(4); }

    switch (type) {
      case 'bool':         return this.parseBoolean();
      case 'type': case 'GlbC': return this.parseClass();
      case 'Objc': case 'GlbO': return new Descriptor(this.file).parse();
      case 'doub':         return this.parseDouble();
      case 'enum':         return this.parseEnum();
      case 'alis':         return this.parseAlias();
      case 'Pth':          return this.parseFilePath();
      case 'long':         return this.parseInteger();
      case 'comp':         return this.parseLargeInteger();
      case 'VlLs':         return this.parseList();
      case 'ObAr':         return this.parseObjectArray();
      case 'tdta':         return this.parseRawData();
      case 'obj ':         return this.parseReference();
      case 'TEXT':         return this.file.readUnicodeString();
      case 'UntF':         return this.parseUnitDouble();
      case 'UnFl':         return this.parseUnitFloat();
    }
  }

  parseBoolean() { return this.file.readBoolean(); }
  parseDouble() { return this.file.readDouble(); }
  parseInteger() { return this.file.readInt(); }
  parseLargeInteger() { return this.file.readLongLong(); }
  parseIdentifier() { return this.file.readInt(); }
  parseIndex() { return this.file.readInt(); }
  parseOffset() { return this.file.readInt(); }

  // Parses a Property, which consists of a class and a unique ID.
  parseProperty() {
    return {
      class: this.parseClass(),
      id: this.parseId()
    };
  }

  // Parses an enumerator, which consists of 2 IDs, one of which is
  // the type, and the other is the value.
  parseEnum() {
    return {
      type: this.parseId(),
      value: this.parseId()
    };
  }

  // Parses an enumerator reference, which consists of a class and
  // 2 IDs: a type and value.
  parseEnumReference() {
    return {
      class: this.parseClass(),
      type: this.parseId(),
      value: this.parseId()
    };
  }

  // Parses an Alias, which is a string of arbitrary length.
  parseAlias() {
    const len = this.file.readInt();
    return this.file.readString(len);
  }

  // Parses a file path, which consists of a 4 character signature
  // and a path.
  parseFilePath() {
    const len = this.file.readInt();
    const sig = this.file.readString(4);

    // Little endian. Who knows.
    const pathSize = this.file.read('<i');
    const numChars = this.file.read('<i');

    const path = this.file.readUnicodeString(numChars);

    return {
      sig,
      path
    };
  }

  // Parses a list/array of Items.
  parseList() {
    const count = this.file.readInt();
    const items = [];

    for (let i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      items.push(this.parseItem());
    }

    return items;
  }

  // Not documented anywhere and unsure of the data format. Luckily, this
  // type is extremely rare. In fact, it's so rare, that I've never run into it
  // among any of my PSDs.
  parseObjectArray() {
    throw `Descriptor object array not implemented yet @ ${this.file.tell()}`;
  }

  // Parses raw byte data of arbitrary length.
  parseRawData() {
    const len = this.file.readInt();
    return this.file.read(len);
  }

  // Parses a Reference, which is an array of items of multiple types.
  parseReference() {
    const numItems = this.file.readInt();
    const items = [];

    for (let i = 0, end = numItems, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      var type = this.file.readString(4);
      const value = (() => { switch (type) {
        case 'prop': return this.parseProperty();
        case 'Clss': return this.parseClass();
        case 'Enmr': return this.parseEnumReference();
        case 'Idnt': return this.parseIdentifier();
        case 'indx': return this.parseIndex();
        case 'name': return this.file.readUnicodeString();
        case 'rele': return this.parseOffset();
      } })();

      items.push({type, value});
    }

    return items;
  }

  // Parses a double with a unit, such as angle, percent, pixels, etc.
  // Returns an object with an ID, a unit, and a value.
  parseUnitDouble() {
    const unitId = this.file.readString(4);
    const unit = (() => { switch (unitId) {
      case '#Ang': return 'Angle';
      case '#Rsl': return 'Density';
      case '#Rlt': return 'Distance';
      case '#Nne': return 'None';
      case '#Prc': return 'Percent';
      case '#Pxl': return 'Pixels';
      case '#Mlm': return 'Millimeters';
      case '#Pnt': return 'Points';
    } })();

    const value = this.file.readDouble();
    return {id: unitId, unit, value};
  }

  // Parses a float with a unit, such as angle, percent, pixels, etc.
  // Returns an object with an ID, a unit, and a value.
  parseUnitFloat() {
    const unitId = this.file.readString(4);
    const unit = (() => { switch (unitId) {
      case '#Ang': return 'Angle';
      case '#Rsl': return 'Density';
      case '#Rlt': return 'Distance';
      case '#Nne': return 'None';
      case '#Prc': return 'Percent';
      case '#Pxl': return 'Pixels';
      case '#Mlm': return 'Millimeters';
      case '#Pnt': return 'Points';
    } })();

    const value = this.file.readFloat();
    return {id: unitId, unit, value};
  }
});
    
