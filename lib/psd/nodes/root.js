/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Root;
const _     = require('lodash');
const Node  = require('../node.js');
const Group = require('./group.js');
const Layer = require('./layer.js');

module.exports = (Root = (function() {
  Root = class Root extends Node {
    static initClass() {
  
      this.prototype.type = 'root';
    }
    static layerForPsd(psd) {
      const layer = {};
      for (let prop of Array.from(Node.PROPERTIES)) { layer[prop] = null; }

      layer.top = 0;
      layer.left = 0;
      layer.right = psd.header.width;
      layer.bottom = psd.header.height;
      return layer;
    }

    constructor(psd) {
      this.psd = psd;
      super(Root.layerForPsd(this.psd));
      this.buildHeirarchy();
    }

    documentDimensions() { return [
      this.width,
      this.height
    ]; }

    depth() { return 0; }
    opacity() { return 255; }
    fillOpacity() { return 255; }

    export() {
      return {
        children: this._children.map(c => c.export()),
        document: {
          width: this.width,
          height: this.height,
          resources: {
            layerComps: __guard__(this.psd.resources.resource('layerComps'), x => x.export()) || [],
            resolutionInfo: __guard__(this.psd.resources.resource('resolutionInfo'), x1 => x1.export()) || [],
            guides: __guard__(this.psd.resources.resource('guides'), x2 => x2.export()),
            slices: []
          }
        }
      };
    }


    buildHeirarchy() {
      let currentGroup = this;
      const parseStack = [];

      for (let layer of Array.from(this.psd.layers)) {
        if (layer.isFolder()) {
          parseStack.push(currentGroup);
          currentGroup = new Group(layer, _.last(parseStack));
        } else if (layer.isFolderEnd()) {
          const parent = parseStack.pop();
          parent.children().push(currentGroup);
          currentGroup = parent;
        } else {
          currentGroup.children().push(new Layer(layer, currentGroup));
        }
      }

      return this.updateDimensions();
    }
  };
  Root.initClass();
  return Root;
})());
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}