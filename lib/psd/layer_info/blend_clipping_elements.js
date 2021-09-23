/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let BlendClippingElements;
const LayerInfo = require('../layer_info.js');

module.exports = (BlendClippingElements = class BlendClippingElements extends LayerInfo {
  static shouldParse(key) { return key === 'clbl'; }

  parse() {
    this.enabled = this.file.readBoolean();
    return this.file.seek(3, true);
  }
});