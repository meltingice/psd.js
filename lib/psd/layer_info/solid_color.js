/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let SolidColor;
const LayerInfo = require('../layer_info.js');
const Descriptor = require('../descriptor.js');

module.exports = (SolidColor = class SolidColor extends LayerInfo {
  static shouldParse(key) { return key === 'SoCo'; }

  constructor(layer, length) {
    super(layer, length);

    this.r = (this.g = (this.b = 0));
  }

  parse() {
    this.file.seek(4, true);
    this.data = new Descriptor(this.file).parse();

    this.r = Math.round(this.colorData()['Rd  ']);
    this.g = Math.round(this.colorData()['Grn ']);
    return this.b = Math.round(this.colorData()['Bl  ']);
  }

  colorData() { return this.data['Clr ']; }
  color() { return [this.r, this.g, this.b]; }
});
