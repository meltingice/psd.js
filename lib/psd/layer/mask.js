/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Mask = require('../mask.coffee');

module.exports = {
  // Every layer has a mask section, whether or not the layer actually
  // has a mask defined. If there is no mask, then the mask size will be
  // 0 and we'll move on to the next thing.
  parseMaskData() {
    return this.mask = new Mask(this.file).parse();
  }
};
