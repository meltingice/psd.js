/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let VectorStrokeContent;
const LayerInfo = require('../layer_info.coffee');
const Descriptor = require('../descriptor.coffee');

module.exports = (VectorStrokeContent = class VectorStrokeContent extends LayerInfo {
  static shouldParse(key) { return key === 'vscg'; }

  parse() {
    this.file.seek(8, true);
    return this.data = new Descriptor(this.file).parse();
  }
});
