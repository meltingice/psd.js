let LayerInfo;
module.exports = (LayerInfo = class LayerInfo {
  constructor(layer, length) {
    this.layer = layer;
    this.length = length;
    this.file = this.layer.file;
    this.section_end = this.file.tell() + this.length;
    this.data = {};
  }

  skip() { return this.file.seek(this.section_end); }
  parse() { return this.skip(); } // skip by default
});