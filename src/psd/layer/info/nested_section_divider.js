import LayerInfo from './base'

export default class NestedSectionDivider extends LayerInfo {
  static name = "nestedSectionDivider";
  static shouldParse(key) { return key === "lsdk" }

  isFolder = false;
  isHidden = false;

  parse() {
    const code = this.file.readInt();

    switch (code) {
      case 1:
      case 2:
        this.isFolder = true;
        break;
      case 3:
        this.isHidden = true;
        break;
    }
  }
}
