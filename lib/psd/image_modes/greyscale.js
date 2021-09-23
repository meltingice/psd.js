/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  setGreyscaleChannels() {
    this.channelsInfo = [{id: 0}];
    if (this.channels() === 2) { return this.channelsInfo.push({id: -1}); }
  },

  combineGreyscaleChannel() {
    return (() => {
      const result = [];
      for (let i = 0, end = this.numPixels, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        const grey = this.channelData[i];
        const alpha = this.channels() === 2 ?
          this.channelData[this.channelLength + i]
        :
          255;

        result.push(this.pixelData.set([grey, grey, grey, alpha], i*4));
      }
      return result;
    })();
  }
};
