/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ObjectEffects;
const LayerInfo = require('../layer_info.js');
const Descriptor = require('../descriptor.js');

module.exports = (ObjectEffects = class ObjectEffects extends LayerInfo {
  static shouldParse(key) { return ['lfx2', 'lmfx'].includes(key); }

  parse() {
    this.file.seek(8, true);
    return this.data = new Descriptor(this.file).parse();
  }
});
