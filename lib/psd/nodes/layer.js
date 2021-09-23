/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Layer;
const _    = require('lodash');
const Node = require('../node.js');

module.exports = (Layer = (function() {
  Layer = class Layer extends Node {
    static initClass() {
      this.prototype.type = 'layer';
    }

    isEmpty() { return (this.width === 0) || (this.height === 0); }

    export() {
      return _.merge(super.export(), {
        type: 'layer',
        mask: this.layer.mask.export(),
        text: __guard__(this.get('typeTool'), x => x.export()),
        image: {}
      });
    }
  };
  Layer.initClass();
  return Layer;
})());

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}