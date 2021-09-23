/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LayerComps;
const Descriptor = require('../descriptor.js');

module.exports = (LayerComps = (function() {
  LayerComps = class LayerComps {
    static initClass() {
      this.prototype.id = 1065;
      this.prototype.name = 'layerComps';
    }

    static visibilityCaptured(comp) {
      return comp.capturedInfo & (parseInt('001', 2) > 0);
    }

    static positionCaptured(comp) {
      return comp.positionCaptured & (parseInt('010', 2) > 0);
    }

    static appearanceCaptured(comp) {
      return comp.appearanceCaptured & (parseInt('100', 2) > 0);
    }

    constructor(resource) {
      this.resource = resource;
      this.file = this.resource.file;
    }

    parse() {
      this.file.seek(4, true);
      return this.data = new Descriptor(this.file).parse();
    }

    names() { return this.data.list.map(comp => comp['Nm  ']); }
    export() {
      return this.data.list.map(comp => ({
        id: comp.compID,
        name: comp['Nm  '],
        capturedInfo: comp.capturedInfo
      }));
    }
  };
  LayerComps.initClass();
  return LayerComps;
})());