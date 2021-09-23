/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Header;
const {Module} = require('coffeescript-module');

// Represents the header of the PSD, which is the first thing always parsed.
// The header stores important information about the PSD such as the dimensions
// and the color depth.
module.exports = (Header = (function() {
  let MODES = undefined;
  Header = class Header extends Module {
    static initClass() {
      this.aliasProperty('height', 'rows');
      this.aliasProperty('width', 'cols');
  
      // All of the color modes are stored internally as a short from 0-15.
      // This is a mapping of that value to a human-readable name.
      MODES = [
        'Bitmap',
        'GrayScale',
        'IndexedColor',
        'RGBColor',
        'CMYKColor',
        'HSLColor',
        'HSBColor',
        'Multichannel',
        'Duotone',
        'LabColor',
        'Gray16',
        'RGB48',
        'Lab48',
        'CMYK64',
        'DeepMultichannel',
        'Duotone16'
      ];
  
      // The signature of the PSD. Should be 8BPS.
      this.prototype.sig = null;
  
      // The version of the PSD. Should be 1.
      this.prototype.version = null;
  
      // The number of color channels in the PSD.
      this.prototype.channels = null;
  
      // The height of the PSD. Can also be accessed with `height`.
      this.prototype.rows = null;
  
      // The width of the PSD. Can also be accessed with `width`.
      this.prototype.cols = null;
  
      // The bit depth of the PSD.
      this.prototype.depth = null;
  
      // The color mode of the PSD.
      this.prototype.mode = null;
  }

    // Creates a new Header.
    // @param [File] file The PSD file.
    constructor(file) {
      this.file = file;
  }

    // Parses the header data.
    parse() {
      this.sig = this.file.readString(4);
      if (this.sig !== '8BPS') {
        throw new Error('Invalid file signature detected. Got: '+this.sig+'. Expected 8BPS.');
    }
      this.version = this.file.readUShort();

      this.file.seek(6, true);

      this.channels = this.file.readUShort();
      this.rows = (this.height = this.file.readUInt());
      this.cols = (this.width = this.file.readUInt());
      this.depth = this.file.readUShort();
      this.mode = this.file.readUShort();

      const colorDataLen = this.file.readUInt();
      return this.file.seek(colorDataLen, true);
  }

    // Converts the color mode key to a readable version.
    modeName() { return MODES[this.mode]; }

    // Exports all of the header data in a basic object.
    export() {
      const data = {};
      for (let key of ['sig', 'version', 'channels', 'rows', 'cols', 'depth', 'mode']) {
        data[key] = this[key];
      }

      return data;
  }
};
  Header.initClass();
  return Header;
})());
