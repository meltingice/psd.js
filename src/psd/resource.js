import { pad2 } from './util'
import LayerComps from './resources/layer_comps'

export default class Resource {
  static RESOURCES = [
    LayerComps
  ]

  constructor(file) {
    this.file = file;
    this.id = null;
    this.name = null;
    this.type = null;
    this.length = 0;
  }

  parse() {
    this.type = this.file.readString(4);
    this.id = this.file.readShort();

    const nameLength = pad2(this.file.readByte() + 1) - 1;
    this.name = this.file.readString(nameLength);
    this.length = pad2(this.file.readInt());

    const resourceEnd = this.file.tell() + this.length;

    this._buildResourceSection();

    if (!this.section) {
      this.file.seek(resourceEnd);
      return;
    }

    return this.section;
  }

  _buildResourceSection() {
    const Section = Resource.RESOURCES.find(r => r.id === this.id);
    if (!Section) return;

    this.name = Section.name;
    this.section = new Section(this);
    this.section.parse();
  }
}
