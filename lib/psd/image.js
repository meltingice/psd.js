/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Image;
const {Module}    = require('coffeescript-module');

const ImageFormat = require('./image_format.coffee');
const ImageMode   = require('./image_mode.coffee');
const Export      = require('./image_export.coffee');

// Represents the full preview image at the end of the PSD document. For this image, the
// compression is defined for all channels, and there is no mask data. The width and height
// are derived from the PSD header, which is the full size of the PSD document.
module.exports = (Image = (function() {
  let COMPRESSIONS = undefined;
  Image = class Image extends Module {
    static initClass() {
      // Here we include all of our important mixins.
      this.includes(ImageFormat.RAW);
      this.includes(ImageFormat.RLE);
      this.includes(ImageMode.Greyscale);
      this.includes(ImageMode.RGB);
      this.includes(ImageMode.CMYK);
      this.includes(Export.PNG);
    
      // Images can be 1 of 4 different compression types. RLE is the most prevalent, followed by
      // RAW. ZIP compression only happens under special circumstances, and is somewhat rare.
      COMPRESSIONS = [
        'Raw',
        'RLE',
        'ZIP',
        'ZIPPrediction'
      ];
  
      // Some helper methods that grab data from the PSD header.
      for (let attr of ['width', 'height', 'channels', 'depth', 'mode']) { (attr => {
        return this.prototype[attr] = function() { return this.header[attr]; };
      })(attr); }
    }

    constructor(file, header) {
      // We can easily calculate the number of pixels with the width and height.
      this.file = file;
      this.header = header;
      this.numPixels = this.width() * this.height();
      if (this.depth() === 16) { this.numPixels *= 2; }

      this.calculateLength();

      // The resulting array that stores the pixel data, formatted in RGBA format.
      this.pixelData = new Uint8Array(this.channelLength * 4);
      this.maskData =  new Uint8Array(this.maskLength * 4);

      // This temporarily holds the raw channel data after it's been parsed, but not
      // processed.
      this.channelData = new Uint8Array(this.length + this.maskLength);

      this.opacity = 1.0;
      this.hasMask = false;

      this.startPos = this.file.tell();
      this.endPos = this.startPos + this.length;

      this.setChannelsInfo();
    }

    // Sets the channel info based on the PSD color mode.
    setChannelsInfo() {
      switch (this.mode()) {
        case 1: return this.setGreyscaleChannels();
        case 3: return this.setRgbChannels();
        case 4: return this.setCmykChannels();
      }
    }

    // Calculates the length of the image data.
    calculateLength() {
      this.length = (() => { switch (this.depth()) {
        case 1: return ((this.width() + 7) / 8) * this.height();
        case 16: return this.width() * this.height() * 2;
        default: return this.width() * this.height();
      } })();

      this.channelLength = this.length;
      this.length *= this.channels();

      if (this.layer && this.layer.mask.size) {
        return this.maskLength = this.layer.mask.width * this.layer.mask.height;
      } else {
        return this.maskLength = 0;
      }
    }

    // Parses the image and formats the image data.
    parse() {
      this.compression = this.parseCompression();

      if ([2, 3].includes(this.compression)) {
        this.file.seek(this.endPos);
        return;
      }

      return this.parseImageData();
    }

    // Parses the compression mode.
    parseCompression() { return this.file.readShort(); }
    
    // Parses the image data based on the compression mode.
    parseImageData() {
      switch (this.compression) {
        case 0: this.parseRaw(); break;
        case 1: this.parseRLE(); break;
        case 2: case 3: this.parseZip(); break;
        default: this.file.seek(this.endPos);
      }

      return this.processImageData();
    }

    // Processes the parsed image data based on the color mode.
    processImageData() {
      switch (this.mode()) {
        case 1: this.combineGreyscaleChannel(); break;
        case 3: this.combineRgbChannel(); break;
        case 4: this.combineCmykChannel(); break;
      }

      return this.channelData = null;
    }
  };
  Image.initClass();
  return Image;
})());
