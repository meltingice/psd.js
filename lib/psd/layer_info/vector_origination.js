/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let VectorOrigination;
const LayerInfo = require('../layer_info.js');
const Descriptor = require('../descriptor.js');

module.exports = (VectorOrigination = class VectorOrigination extends LayerInfo {
  static shouldParse(key) { return key === 'vogk'; }

  parse() {
    this.file.seek(8, true);
    return this.data = new Descriptor(this.file).parse();
  }
});
