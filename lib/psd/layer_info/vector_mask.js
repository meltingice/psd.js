/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let VectorMask;
const LayerInfo = require('../layer_info.coffee');
const PathRecord = require('../path_record.coffee');

module.exports = (VectorMask = class VectorMask extends LayerInfo {
  static shouldParse(key) { return ['vmsk', 'vsms'].includes(key); }

  constructor(layer, length) {
    super(layer, length);

    this.invert = null;
    this.notLink = null;
    this.disable = null;
    this.paths = [];
  }

  parse() {
    this.file.seek(4, true); // version
    const tag = this.file.readInt();

    this.invert = (tag & 0x01) > 0;
    this.notLink = (tag & (0x01 << 1)) > 0;
    this.disable = (tag & (0x01 << 2)) > 0;

    // I haven't figured out yet why this is 10 and not 8.
    const numRecords = (this.length - 10) / 26;
    return (() => {
      const result = [];
      for (let i = 0, end = numRecords, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        const record = new PathRecord(this.file);
        record.parse();

        result.push(this.paths.push(record));
      }
      return result;
    })();
  }

  export() {
    return {
      invert: this.invert,
      notLink: this.notLink,
      disable: this.disable,
      paths: this.paths.map(p => p.export())
    };
  }
});
