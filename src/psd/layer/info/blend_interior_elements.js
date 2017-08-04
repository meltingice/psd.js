import LayerInfo from './base'

export default class BlendInteriorElements extends LayerInfo {
  static name = "blendInteriorElements";
  static shouldParse(key) { return key === 'infx' }

  parse() {
    this.enabled = this.file.readBoolean();
    this.file.seek(3, true);
  }
}
