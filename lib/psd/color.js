/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Util = require('./util.coffee');

module.exports = {
  // Converts from the CMYK color space to the RGB color space using
  // a preset color profile.
  cmykToRgb(c, m, y, k) {
    const r = Util.clamp((65535 - ((c * (255 - k)) + (k << 8))) >> 8, 0, 255);
    const g = Util.clamp((65535 - ((m * (255 - k)) + (k << 8))) >> 8, 0, 255);
    const b = Util.clamp((65535 - ((y * (255 - k)) + (k << 8))) >> 8, 0, 255);
    return [r, g, b];
  }
};
