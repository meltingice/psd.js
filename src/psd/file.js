import { jspack } from 'jspack'
import iconv from 'iconv-lite'

export default class File {
  static FORMATS = {
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
  }

  constructor(data) {
    this.data = data;
    this.pos = 0;
  }

  tell() {
    return this.pos;
  }

  read(length) {
    let result = [];
    for (var i = 0; i < length; i++) {
      result.push(this.data[this.pos++]);
    }

    return result;
  }

  readf(format, len = null) {
    return jspack.Unpack(format,
      this.read(len || jspack.CalcLength(format))
    );
  }

  seek(amt, rel = false) {
    this.pos = rel ? (this.pos + amt) : amt;
  }

  readString(length) {
    return String.fromCharCode
      .apply(null, this.read(length))
      .replace(/\u0000/g, '');
  }

  readUnicodeString(length = null) {
    if (!length) length = this.readInt();
    return iconv
      .decode(new Buffer(this.read(length * 2)), 'utf-16be')
      .replace(/\u0000/g, '');
  }

  readByte() {
    return this.read(1)[0];
  }

  readBoolean() {
    return this.readByte() !== 0;
  }
}

// Defines all of the readers for each data type on File.
for (var format in File.FORMATS) {
  if (!File.FORMATS.hasOwnProperty(format)) continue;
  const info = File.FORMATS[format];

  (function (format, info) {
    File.prototype[`read${format}`] = function() {
      return this.readf(info.code, info.length)[0];
    }
  })(format, info)
}
