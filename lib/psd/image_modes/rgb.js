/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  setRgbChannels() {
    this.channelsInfo = [
      {id: 0},
      {id: 1},
      {id: 2}
    ];

    if (this.channels() === 4) { return this.channelsInfo.push({id: -1}); }
  },

  combineRgbChannel() {
    const rgbChannels = this.channelsInfo
      .map(ch => ch.id)
      .filter(ch => ch >= -1); // Mask data is -2

    for (let i = 0, end = this.numPixels, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      var b, g;
      let r = (g = (b = 0));
      let a = 255;

      for (let index = 0; index < rgbChannels.length; index++) {
        const chan = rgbChannels[index];
        const val = this.channelData[i + (this.channelLength * index)];

        switch (chan) {
          case -1: a = val; break;
          case 0: r = val; break;
          case 1: g = val; break;
          case 2: b = val; break;
        }
      }
      this.pixelData.set([r, g, b, a], i*4);
    }

    return this.readMaskData(rgbChannels);
  },

  readMaskData(rgbChannels) {
      
    if (this.hasMask) {
      const maskPixels = this.layer.mask.width * this.layer.mask.height;
      const offset = this.channelLength * rgbChannels.length;
      return (() => {
        const result = [];
        for (let i = 0, end = maskPixels, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
          const val = this.channelData[i + offset];
          result.push(this.maskData.set([0, 0, 0, val], i*4));
        }
        return result;
      })();
    }
  }
};
