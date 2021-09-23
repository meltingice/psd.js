/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  // Every layer starts with the basics. Here we have the layer dimensions,
  // the number of color channels for the image data, and information about
  // the color channels.
  parsePositionAndChannels() {
    this.top = this.file.readInt();
    this.left = this.file.readInt();
    this.bottom = this.file.readInt();
    this.right = this.file.readInt();
    this.channels = this.file.readShort();

    this.rows = (this.height = this.bottom - this.top);
    this.cols = (this.width = this.right - this.left);

    // Every color channel has both an ID and a length. The ID correlates to
    // the color channel, e.g. 0 = R, 1 = G, 2 = B, -1 = A, and the length is
    // the size of the data.
    return (() => {
      const result = [];
      for (let i = 0, end = this.channels, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        const id = this.file.readShort();
        const length = this.file.readInt();

        result.push(this.channelsInfo.push({id, length}));
      }
      return result;
    })();
  }
};
