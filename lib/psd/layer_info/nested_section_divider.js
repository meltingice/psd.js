/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let NestedSectionDivider;
const LayerInfo = require('../layer_info.js');

// Not 100% sure what the purpose of this key is, but it seems to exist
// whenever the lsct key doesn't. Parsing this like a layer section
// divider seems to solve a lot of parsing issues with folders.
//
// See https://github.com/layervault/psd.rb/issues/38
module.exports = (NestedSectionDivider = class NestedSectionDivider extends LayerInfo {
  static shouldParse(key) { return key === 'lsdk'; }

  constructor(layer, length) {
    super(layer, length);

    this.isFolder = false;
    this.isHidden = false;
  }

  parse() {
    const code = this.file.readInt();

    switch (code) {
      case 1: case 2: return this.isFolder = true;
      case 3: return this.isHidden = true;
    }
  }
});
