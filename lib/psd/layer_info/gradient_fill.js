/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let GradientFill;
const LayerInfo = require('../layer_info.coffee');
const Descriptor = require('../descriptor.coffee');

module.exports = (GradientFill = class GradientFill extends LayerInfo {
  static shouldParse(key) { return key === 'GdFl'; }

  parse() {
    this.file.seek(4, true); // Skip sig
    return this.data = new Descriptor(this.file).parse();
  }
});