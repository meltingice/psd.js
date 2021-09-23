/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Layer;
const {Module} = require('coffeescript-module');

// Represents a single layer and all of the data associated with
// that layer. Typically you will access this data from a Node
// object, which simplifies access for you.
module.exports = (Layer = (function() {
  Layer = class Layer extends Module {
    static initClass() {
      // Mixins for all of the various data each layer contains.
      this.includes(require('./layer/position_channels.coffee'));
      this.includes(require('./layer/blend_modes.coffee'));
      this.includes(require('./layer/mask.coffee'));
      this.includes(require('./layer/blending_ranges.coffee'));
      this.includes(require('./layer/name.coffee'));
      this.includes(require('./layer/info.coffee'));
      this.includes(require('./layer/helpers.coffee'));
      this.includes(require('./layer/channel_image.coffee'));
    }

    constructor(file, header) {
      this.file = file;
      this.header = header;
      this.mask = {};
      this.blendingRanges = {};
      this.adjustments = {};
      this.channelsInfo = [];
      this.blendMode = {};
      this.groupLayer = null;

      this.infoKeys = [];

      // The layer's name can come from one of two places, depending on 
      // what version of Photoshop was used to create the PSD.
      Object.defineProperty(this, 'name', {
        get() {
          if (this.adjustments['name'] != null) {
            return this.adjustments['name'].data;
          } else {
            return this.legacyName;
          }
        }
      }
      );
    }

    // Every layer starts with the same set of data, and ends with a dynamic
    // number of layer info blocks.
    parse() {
      this.parsePositionAndChannels();
      this.parseBlendModes();

      const extraLen = this.file.readInt();
      this.layerEnd = this.file.tell() + extraLen;

      this.parseMaskData();
      this.parseBlendingRanges();
      this.parseLegacyLayerName();
      this.parseLayerInfo();

      this.file.seek(this.layerEnd);
      return this;
    }

    export() {
      return {
        name: this.name,
        top: this.top,
        right: this.right,
        bottom: this.bottom,
        left: this.left,
        width: this.width,
        height: this.height,
        opacity: this.opacity,
        visible: this.visible,
        clipped: this.clipped,
        mask: this.mask.export()
      };
    }
  };
  Layer.initClass();
  return Layer;
})());
