/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  parseRaw() {
    for (let i = this.chanPos, end = (this.chanPos + this.chan.length) - 2, asc = this.chanPos <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      this.channelData[i] = this.file.readByte();
    }

    return this.chanPos += (this.chan.length - 2);
  }
};
