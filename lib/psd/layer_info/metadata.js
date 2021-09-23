/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Metadata;
const LayerInfo = require('../layer_info.coffee');
const Descriptor = require('../descriptor.coffee');

module.exports = (Metadata = class Metadata extends LayerInfo {
  static shouldParse(key) { return key === 'shmd'; }

  parse() {
    const count = this.file.readInt();

    return (() => {
      const result = [];
      for (let i = 0, end1 = count, asc = 0 <= end1; asc ? i < end1 : i > end1; asc ? i++ : i--) {
        this.file.seek(4, true);

        const key = this.file.readString(4);
      
        const copyOnSheetDup = this.file.readByte();
        this.file.seek(3, true); //padding

        const len = this.file.readInt();
        const end = this.file.tell() + len;

        if (key === 'cmls') { this.parseLayerComps(); }

        result.push(this.file.seek(end));
      }
      return result;
    })();
  }

  parseLayerComps() {
    this.file.seek(4, true);
    return this.data.layerComp = new Descriptor(this.file).parse();
  }
});