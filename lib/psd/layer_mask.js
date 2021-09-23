/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LayerMask;
const _ = require('lodash');
const Util = require('./util.js');
const Layer = require('./layer.js');

// The layer mask is the overarching data structure that describes both
// the layers/groups in the PSD document, and the global mask.
// This part of the document is ordered as such:
// 
// * Layers
// * Layer images
// * Global Mask
// 
// The file does not need to have a global mask. If there is none, then
// its length will be zero.
module.exports = (LayerMask = class LayerMask {
  constructor(file, header) {
    this.file = file;
    this.header = header;
    this.layers = [];
    this.mergedAlpha = false;
    this.globalMask = null;
  }

  skip() { return this.file.seek(this.file.readInt(), true); }

  parse() {
    const maskSize = this.file.readInt();
    const finish = maskSize + this.file.tell();

    if (maskSize <= 0) { return; }

    this.parseLayers();
    this.parseGlobalMask();

    // The layers are stored in the reverse order that we would like them. In other
    // words, they're stored bottom to top and we want them top to bottom.
    this.layers.reverse();

    return this.file.seek(finish);
  }

  parseLayers() {
    const layerInfoSize = Util.pad2(this.file.readInt());

    if (layerInfoSize > 0) {
      let layerCount = this.file.readShort();

      if (layerCount < 0) {
        layerCount = Math.abs(layerCount);
        this.mergedAlpha = true;
      }

      for (let i = 0, end = layerCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        this.layers.push(new Layer(this.file, this.header).parse());
      }

      return Array.from(this.layers).map((layer) => layer.parseChannelImage());
    }
  }

  parseGlobalMask() {
    const length = this.file.readInt();
    if (length <= 0) { return; }

    const maskEnd = this.file.tell() + length;

    this.globalMask = _({}).tap(mask => {
      mask.overlayColorSpace = this.file.readShort();
      mask.colorComponents = [
        this.file.readShort() >> 8,
        this.file.readShort() >> 8,
        this.file.readShort() >> 8,
        this.file.readShort() >> 8
      ];

      mask.opacity = this.file.readShort() / 16.0;

      // 0 = color selected, 1 = color protected, 128 = use value per layer
      return mask.kind = this.file.readByte();
    });

    return this.file.seek(maskEnd);
  }
});
