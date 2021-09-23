/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let Locked;
const LayerInfo = require('../layer_info.js');

module.exports = (Locked = class Locked extends LayerInfo {
  static shouldParse(key) { return key === 'lspf'; }

  constructor(layer, length) {
    super(layer, length);

    this.transparencyLocked = false;
    this.compositeLocked = false;
    this.positionLocked = false;
    this.allLocked = false;
  }

  parse() {
    const locked = this.file.readInt();

    this.transparencyLocked = ((locked & (0x01 << 0)) > 0) || (locked === -2147483648);
    this.compositeLocked = ((locked & (0x01 << 1)) > 0) || (locked === -2147483648);
    this.positionLocked = ((locked & (0x01 << 2)) > 0) || (locked === -2147483648);

    return this.allLocked = this.transparencyLocked && this.compositeLocked && this.positionLocked;
  }
});