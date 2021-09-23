let UnicodeName;
const LayerInfo = require('../layer_info.js');

module.exports = (UnicodeName = class UnicodeName extends LayerInfo {
  static shouldParse(key) { return key === 'luni'; }

  parse() {
    const pos = this.file.tell();
    this.data = this.file.readUnicodeString();

    this.file.seek(pos + this.length);
    return this;
  }
});