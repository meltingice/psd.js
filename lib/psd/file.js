/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let File;
const {jspack} = require('jspack');
const iconv = require('iconv-lite');
const Color = require('./color.js');
const Util = require('./util.js');

// A file abstraction that stores the PSD file data, and
// assists in parsing it.
module.exports = (File = (function() {
  let FORMATS = undefined;
  File = class File {
    static initClass() {
      FORMATS = {
        Int: {
          code: '>i',
          length: 4
        },
        UInt: {
          code: '>I',
          length: 4
        },
        Short: {
          code: '>h',
          length: 2
        },
        UShort: {
          code: '>H',
          length: 2
        },
        Float: {
          code: '>f',
          length: 4
        },
        Double: {
          code: '>d',
          length: 8
        },
        LongLong: {
          code: '>q',
          length: 8
        }
      };
  
      for (let format of Object.keys(FORMATS || {})) { 
        const info = FORMATS[format]; 
        ((format, info) => {
        this.prototype[`read${format}`] = function() { return this.readf(info.code, info.length)[0]; };
        return this.prototype[`read${format}`];
      })(format, info); }
  
      // The current cursor position in the file.
      this.prototype.pos = 0;
    }

    // Creates a new File with the given Uint8Array.
    constructor(data) {
      this.data = data;
    }

    // Returns the current cursor position.
    tell() { return this.pos; }

    // Reads raw file data with no processing.
    read(length) { return (__range__(0, length, false).map((i) => this.data[this.pos++])); }

    // Reads file data and processes it with the given unpack format string. If the length is
    // omitted, then it will be calculated automatically based on the format string.
    readf(format, len = null) { return jspack.Unpack(format, this.read(len || jspack.CalcLength(format))); }

    // Moves the cursor without parsing data. If `rel = false`, then the cursor will be set to the
    // given value, which effectively sets the position relative to the start of the file. If
    // `rel = true`, then the cursor will be moved relative to the current position.
    seek(amt, rel) { if (rel == null) { rel = false; } if (rel) { return this.pos += amt; } else { return this.pos = amt; } }

    // Reads a String of the given length.
    readString(length) { return String.fromCharCode.apply(null, this.read(length)).replace(/\u0000/g, ""); }

    // Reads a Unicode UTF-16BE encoded string.
    readUnicodeString(length = null) {
      if (!length) { length = this.readInt(); }
      return iconv.decode(new Buffer(this.read(length * 2)),'utf-16be').replace(/\u0000/g, "");
    }

    // Helper that reads a single byte.
    readByte() { return this.read(1)[0]; }

    // Helper that reads a single byte and interprets it as a boolean.
    readBoolean() { return this.readByte() !== 0; }

    // Reads a 32-bit color space value.
    readSpaceColor() {
      let colorComponent;
      const colorSpace = this.readShort();
      for (let i = 0; i < 4; i++) { colorComponent = (this.readShort() >> 8); }

      return {colorSpace, components: colorComponent};
    }

    // Adobe's lovely signed 32-bit fixed-point number with 8bits.24bits
    //   http://www.adobe.com/devnet-apps/photoshop/fileformatashtml/PhotoshopFileFormats.htm#50577409_17587
    readPathNumber() {
      const a = this.readByte();
    
      const arr = this.read(3);
      const b1 = arr[0] << 16;
      const b2 = arr[1] << 8;
      const b3 = arr[2];
      const b = b1 | b2 | b3;

      return parseFloat(a, 10) + parseFloat(b / Math.pow(2, 24), 10);
    }
  };
  File.initClass();
  return File;
})());

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}