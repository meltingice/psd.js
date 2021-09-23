/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let VectorStroke;
const LayerInfo = require('../layer_info.coffee');
const Descriptor = require('../descriptor.coffee');

module.exports = (VectorStroke = class VectorStroke extends LayerInfo {
  static shouldParse(key) { return key === 'vstk'; }

  parse() {
    this.file.seek(4, true);
    return this.data = new Descriptor(this.file).parse();
  }
});
