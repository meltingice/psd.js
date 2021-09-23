/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let BlendInteriorElements;
const LayerInfo = require('../layer_info.coffee');

module.exports = (BlendInteriorElements = class BlendInteriorElements extends LayerInfo {
  static shouldParse(key) { return key === 'infx'; }

  parse() {
    this.enabled = this.file.readBoolean();
    return this.file.seek(3, true);
  }
});