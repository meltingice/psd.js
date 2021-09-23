/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs = require('fs');
const {PNG} = require('pngjs');
const RSVP = require('rsvp');

module.exports = {
  toPng() {
    const png = new PNG({filterType: 4, width: this.width(), height: this.height()});
    png.data = this.pixelData;
    return png;
  },

  saveAsPng(output) {
    return new RSVP.Promise((resolve, reject) => {
      return this.toPng()
        .pack()
        .pipe(fs.createWriteStream(output))
        .on('finish', resolve);
    });
  },
        
  maskToPng() {
    const png = new PNG({filterType: 4, width: this.layer.mask.width, height: this.layer.mask.height});
    png.data = this.maskData;
    return png;
  },

  saveMaskAsPng(output) {
    return new RSVP.Promise((resolve, reject) => {
      return this.maskToPng()
        .pack()
        .pipe(fs.createWriteStream(output))
        .on('finish', resolve);
    });
  }
};
