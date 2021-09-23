/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Color = require('../color.coffee');
module.exports = {
  setCmykChannels() {
    this.channelsInfo = [
      { id: 0 },
      { id: 1 },
      { id: 2 },
      { id: 3 }
    ];

    if (this.channels() === 5) { return this.channelsInfo.push({ id: -1 }); }
  },

  combineCmykChannel() {
    const cmykChannels = this.channelsInfo
      .map(ch => ch.id)
      .filter(ch => ch >= -1);

    for (let i = 0, end = this.numPixels, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      var k, m, y;
      let c = (m = (y = (k = 0)));
      let a = 255;

      for (let index = 0; index < cmykChannels.length; index++) {
        const chan = cmykChannels[index];
        const val = this.channelData[i + (this.channelLength * index)];

        switch (chan) {
          case -1: a = val; break;
          case 0: c = val; break;
          case 1: m = val; break;
          case 2: y = val; break;
          case 3: k = val; break;
        }
      }

      const [r, g, b] = Array.from(Color.cmykToRgb(255 - c, 255 - m, 255 - y, 255 - k));
      this.pixelData.set([r, g, b, a], i*4);
    }

    return this.readMaskData(cmykChannels);
  }
};

