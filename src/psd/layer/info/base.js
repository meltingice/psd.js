export default class LayerInfo {
  constructor(layer, length) {
    this.layer = layer;
    this.length = length;
    this.file = this.layer.file;
    this.sectionEnd = this.file.tell() + this.length;
    this.data = null;
  }

  skip() {
    this.file.seek(this.sectionEnd);
  }

  // Override this.
  parse() {
    this.skip();
  }
}
