/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = {
  parseRLE() {
    this.byteCounts = this.parseByteCounts();
    return this.parseChannelData();
  },

  parseByteCounts() {
    return __range__(0, (this.channels() * this.height()), false).map((i) => this.file.readShort());
  },
  
  parseChannelData() {
    this.chanPos = 0;
    this.lineIndex = 0;
    return (() => {
      const result = [];
      for (let i = 0, end = this.channels(), asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
        this.decodeRLEChannel();
        result.push(this.lineIndex += this.height());
      }
      return result;
    })();
  },
          
  decodeRLEChannel() {
    return (() => {
      const result = [];
      for (let j = 0, end = this.height(), asc = 0 <= end; asc ? j < end : j > end; asc ? j++ : j--) {
        const byteCount = this.byteCounts[this.lineIndex + j];
        var finish = this.file.tell() + byteCount;
      
        result.push((() => {
          const result1 = [];
          while (this.file.tell() < finish) {
            let len = this.file.read(1)[0];
        
            if (len < 128) {
              len += 1;
              //@channelData.splice @chanPos, 0, @file.read(len)...
              const data = this.file.read(len);          
              this.channelData.set(data, this.chanPos);
              result1.push(this.chanPos += len);
            } else if (len > 128) {
              len ^= 0xff;
              len += 2;

              const val = this.file.read(1)[0];
              //@channelData[@chanPos++] = val for i in [0...len]
              this.channelData.fill(val, this.chanPos, this.chanPos+len);
              result1.push(this.chanPos += len);
            } else {
              result1.push(undefined);
            }
          }
          return result1;
        })());
      }
      return result;
    })();
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