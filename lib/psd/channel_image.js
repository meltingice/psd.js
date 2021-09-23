/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let ChannelImage;
const _           = require('lodash');
const Image       = require('./image.js');
const ImageFormat = require('./image_format.js');

// Represents an image for a single layer, which differs slightly in format from
// the full size preview image.
// 
// The full preview at the end of the PSD document has the same compression for all
// channels, whereas layer images define the compression per color channel. The
// dimensions can also differ per channel if we're parsing mask data (channel ID < -1).
module.exports = (ChannelImage = (function() {
  ChannelImage = class ChannelImage extends Image {
    static initClass() {
      this.includes(ImageFormat.LayerRAW);
      this.includes(ImageFormat.LayerRLE);
    }

    // Creates a new ChannelImage.
    constructor(file, header, layer) {
      // We copy the layer's width and height to private variables because, as you'll see below,
      // the dimensions can change if we're parsing a mask channel.
      this.layer = layer;
      this._width = this.layer.width;
      this._height = this.layer.height;

      super(file, header);

      this.channelsInfo = this.layer.channelsInfo;
      this.hasMask = _.any(this.channelsInfo, c => c.id < -1);
      this.opacity = this.layer.opacity / 255.0;
    }

    // Skip parsing this image by jumping to the end of the data.
    skip() {
      return Array.from(this.channelsInfo).map((chan) =>
        this.file.seek(chan.length, true));
    }

    // The width of the image.
    width() { return this._width; }

    // The height of the image.
    height() { return this._height; }

    // The number of color channels in the image.
    channels() { return this.layer.channels; }

    // Parse the image data. The resulting image data will be formatted to match the Javascript
    // Canvas color format, e.g. `[R, G, B, A, R, G, B, A]`.
    parse() {
      this.chanPos = 0;
      for (let chan of Array.from(this.channelsInfo)) {
        if (chan.length <= 0) {
          this.parseCompression();
          continue;
        }

        this.chan = chan;

        // If we're working with a mask channel, then the mask can define it's own dimensions separate
        // from the image dimensions. We grab these dimensions from the layer's mask data.
        if (chan.id < -1) {
          this._width = this.layer.mask.width;
          this._height = this.layer.mask.height;
        } else {
          this._width = this.layer.width;
          this._height = this.layer.height;
        }

        this.length = this._width * this._height;
        const start = this.file.tell();

        this.parseImageData();

        const finish = this.file.tell();

        if (finish !== (start + this.chan.length)) {
          this.file.seek(start + this.chan.length);
        }
      }

      this._width = this.layer.width;
      this._height = this.layer.height;

      return this.processImageData();
    }

    // Initiates parsing of the image data, which is based on the compression type of the channel. Every
    // channel defines it's own compression type, unlike the full PSD preview, which has a single compression
    // type for the entire image.
    parseImageData() {
      this.compression = this.parseCompression();

      switch (this.compression) {
        case 0: return this.parseRaw();
        case 1: return this.parseRLE();
        case 2: case 3: return this.parseZip();
        default: return this.file.seek(this.endPos);
      }
    }
  };
  ChannelImage.initClass();
  return ChannelImage;
})());
