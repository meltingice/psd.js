/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let BlendMode;
const {Module} = require('coffeescript-module');

// The blend mode describes important data regarding a layer, such as
// the blending mode, the opacity, and whether it's a part of a clipping mask.
module.exports = (BlendMode = (function() {
  let BLEND_MODES = undefined;
  BlendMode = class BlendMode extends Module {
    static initClass() {
      this.aliasProperty('blendingMode', 'mode');
  
      // All of the blend modes are stored in the PSD file with a specific key.
      // This is the mapping of that key to its readable name.
      BLEND_MODES = {
        norm: 'normal',
        dark: 'darken',
        lite: 'lighten',
        hue:  'hue',
        sat:  'saturation',
        colr: 'color',
        lum:  'luminosity',
        mul:  'multiply',
        scrn: 'screen',
        diss: 'dissolve',
        over: 'overlay',
        hLit: 'hard_light',
        sLit: 'soft_light',
        diff: 'difference',
        smud: 'exclusion',
        div:  'color_dodge',
        idiv: 'color_burn',
        lbrn: 'linear_burn',
        lddg: 'linear_dodge',
        vLit: 'vivid_light',
        lLit: 'linear_light',
        pLit: 'pin_light',
        hMix: 'hard_mix',
        pass: 'passthru',
        dkCl: 'darker_color',
        lgCl: 'lighter_color',
        fsub: 'subtract',
        fdiv: 'divide'
      };
    }

    constructor(file) {
      // The 4 character key for the blending mode.
      this.file = file;
      this.blendKey = null;

      // The opacity of the layer, from [0, 255].
      this.opacity = null;

      // Raw value for the clipping state of this layer.
      this.clipping = null;

      // Is this layer a clipping mask?
      this.clipped = null;
      this.flags = null;

      // The readable representation of the blend mode.
      this.mode = null;

      // Is this layer visible?
      this.visible = null;
    }

    // Parses the blend mode data.
    parse() {
      this.file.seek(4, true);

      this.blendKey = this.file.readString(4).trim();
      this.opacity = this.file.readByte();
      this.clipping = this.file.readByte();
      this.flags = this.file.readByte();

      this.mode = BLEND_MODES[this.blendKey];
      this.clipped = this.clipping === 1;

      this.visible = !((this.flags & (0x01 << 1)) > 0);

      return this.file.seek(1, true);
    }

    // Returns the layer opacity as a percentage.
    opacityPercentage() { return (this.opacity * 100) / 255; }
  };
  BlendMode.initClass();
  return BlendMode;
})());
