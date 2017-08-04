import LayerInfo from './base'
import Descriptor from '../../descriptor'

export default class Artboard extends LayerInfo {
  static name = "artboard"
  static shouldParse(key) {
    return key === 'artb';
  }

  parse() {
    this.file.seek(4, true);
    this.data = (new Descriptor(this.file)).parse();
  }

  export() {
    return {
      coords: {
        left: this.data.artboardRect['Left'],
        top: this.data.artboardRect['Top '],
        right: this.data.artboardRect['Rght'],
        bottom: this.data.artboardRect['Btom']
      }
    }
  }
}
