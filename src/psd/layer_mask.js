import { pad2 } from './util'
import Layer from './layer'

export default class LayerMask {
  layers = []
  mergedAlpha = false
  globalMask = null

  constructor(file, header) {
    this.file = file;
    this.header = header;
  }

  skip() {
    this.file.seek(this.file.readInt(), true);
  }

  parse() {
    const maskSize = this.file.readInt();
    const finish = maskSize + this.file.tell();

    if (maskSize <= 0) return;

    this._parseLayers();
  }

  _parseLayers() {
    const layerInfoSize = pad2(this.file.readInt());

    if (layerInfoSize > 0) {
      let layerCount = this.file.readShort();

      if (layerCount < 0) {
        layerCount = Math.abs(layerCount);
        this.mergedAlpha = true;
      }

      let layer;
      for (var i = 0; i < layerCount; i++) {
        layer = new Layer(this.file, this.header);
        layer.parse();

        this.layers.push(layer);
      }

      // Channel images come after all of the layer data
      this.layers.forEach(layer => layer.parseChannelImage());
    }
  }
}
