import LayerInfo from './base'

const SECTION_DIVIDER_TYPES = [
  'other',
  'open folder',
  'closed folder',
  'bounding section divider'
];

export default class SectionDivider extends LayerInfo {
  static name = "sectionDivider";
  static shouldParse(key) { return key === 'lsct' }

  isFolder = false;
  isHidden = false;
  layerType = null;
  blendMode = null;
  subType = null;

  parse() {
    const code = this.file.readInt();
    this.layerType = SECTION_DIVIDER_TYPES[code];

    switch (code) {
      case 1:
      case 2:
        this.isFolder = true;
        break;
      case 3:
        this.isHidden = true;
        break;
    }

    if (this.length < 12) return;

    this.file.seek(4, true);
    this.blendMode = this.file.readString(4);

    if (this.length < 16) return;

    this.subType = this.file.readInt() === 0 ? 'normal' : 'scene group'
  }
}
