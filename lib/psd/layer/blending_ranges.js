/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  // Blending ranges let you control which pixels from this layer and which
  // pixels from the underlying layers appear in the final image. This describes
  // the ranges in both greyscale and for each color channel.
  parseBlendingRanges() {
    const length = this.file.readInt();
    if (length === 0) {
      return;
    }

    this.blendingRanges.grey = {
      source: {
        black: [this.file.readByte(), this.file.readByte()],
        white: [this.file.readByte(), this.file.readByte()]
      },
      dest: {
        black: [this.file.readByte(), this.file.readByte()],
        white: [this.file.readByte(), this.file.readByte()]
      }
    };

    const numChannels = (length - 8) / 8;
    
    this.blendingRanges.channels = [];
    return __range__(0, numChannels, false).map((i) =>
      this.blendingRanges.channels.push({
        source: {
          black: [this.file.readByte(), this.file.readByte()],
          white: [this.file.readByte(), this.file.readByte()]
        },
        dest: {
          black: [this.file.readByte(), this.file.readByte()],
          white: [this.file.readByte(), this.file.readByte()]
        }}));
  }
};

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}