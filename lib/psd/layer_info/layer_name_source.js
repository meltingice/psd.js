/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LayerNameSource;
const LayerInfo = require('../layer_info.coffee');

module.exports = (LayerNameSource = class LayerNameSource extends LayerInfo {
  static shouldParse(key) { return key === 'lnsr'; }

  parse() {
    return this.id = this.file.readString(4);
  }
});