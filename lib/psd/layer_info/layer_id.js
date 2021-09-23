/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LayerId;
const LayerInfo = require('../layer_info.coffee');

module.exports = (LayerId = class LayerId extends LayerInfo {
  static shouldParse(key) { return key === 'lyid'; }

  parse() {
    return this.id = this.file.readInt();
  }
});