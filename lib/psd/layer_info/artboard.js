/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Artboard;
const LayerInfo = require('../layer_info.coffee');
const Descriptor = require('../descriptor.coffee');

module.exports = (Artboard = class Artboard extends LayerInfo {
  static shouldParse(key) { return key === 'artb'; }

  parse() {
    this.file.seek(4, true);
    return this.data = new Descriptor(this.file).parse();
  }

  export() {
    return {
      coords: {
        left: this.data.artboardRect['Left'],
        top: this.data.artboardRect['Top '],
        right: this.data.artboardRect['Rght'],
        bottom: this.data.artboardRect['Btom']
      }
    };
  }
});
