/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const BlendMode = require('../blend_mode.coffee');

module.exports = {
  // Every layer defines how it's blended with the rest of the document.
  // This is represented in the Photoshop UI above the layer list as
  // a drop down. It also defines the layer opacity and whether it's a 
  // part of a clipping mask.
  parseBlendModes() {
    this.blendMode = new BlendMode(this.file);
    this.blendMode.parse();

    this.opacity = this.blendMode.opacity;
    this.visible = this.blendMode.visible;
    return this.clipped = this.blendMode.clipped;
  },

  hidden() { return !this.visible; },

  // TODO: check section divider
  blendingMode() {
    return this.blendMode.mode;
  }
};
