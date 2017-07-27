import File from './psd/file'
import LazyExecute from './psd/lazy_execute'
import Header from './psd/header'
import Resources from './psd/resources'
import LayerMask from './psd/layer_mask'
import Image from './psd/image'

import { imageToPng } from './psd/image/export/png'

class PSD {
  constructor(data) {
    this.file = new File(data);
    this.parsed = false;
    this.header = null;
  }

  parse() {
    if (this.parsed) return;

    this._parseHeader();
    this._parseResources();
    this._parseLayerMask();
    this._parseImage();

    this.parsed = true;
  }

  _parseHeader() {
    this.header = new Header(this.file);
    this.header.parse();
  }

  _parseResources() {
    const resources = new Resources(this.file);
    this.resources = new LazyExecute(resources, this.file)
      .now('skip')
      .later('parse')
      .get();
  }

  _parseLayerMask() {
    const layerMask = new LayerMask(this.file, this.header);
    this.layerMask = new LazyExecute(layerMask, this.file)
      .now('skip')
      .later('parse')
      .get();
  }

  _parseImage() {
    const image = new Image(this.file, this.header);
    this.image = new LazyExecute(image, this.file)
      .later('parse')
      .ignore('width', 'height')
      .get();
  }
}

export default PSD
export {
  imageToPng
}
