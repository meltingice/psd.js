/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let FillOpacity;
const LayerInfo = require('../layer_info.coffee');

module.exports = (FillOpacity = class FillOpacity extends LayerInfo {
  static shouldParse(key) { return key === 'iOpa'; }

  parse() {
    return this.value = this.file.readByte();
  }
});