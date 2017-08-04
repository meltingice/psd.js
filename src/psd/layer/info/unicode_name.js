import LayerInfo from './base'

export default class UnicodeName extends LayerInfo {
  static name = "name"
  static shouldParse(key) {
    return key === 'luni';
  }

  parse() {
    const pos = this.file.tell();
    this.data = this.file.readUnicodeString();

    this.file.seek(pos + this.length);
  }
}
