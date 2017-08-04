import LayerInfo from './base'

export default class BlendClippingElements extends LayerInfo {
  static name = "blendClippingElements";
  static shouldParse(key) { return key === 'clbl' }

  parse() {
    this.enabled = this.file.readBoolean();
    this.file.seek(3, true);
  }
}
