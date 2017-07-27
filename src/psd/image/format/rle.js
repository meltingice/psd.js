function parseRLE(image) {
  const rle = new RLECompression(image);
  rle.parse();
}

class RLECompression {
  byteCounts = null;
  chanPos = 0;
  lineIndex = 0;

  constructor(image) {
    this.image = image;
  }

  parse() {
    this._parseByteCounts();
    this._parseChannelData();
  }

  _parseByteCounts() {
    const { image } = this;
    const { file } = image;
    const channelRows = image.header.channels * image.header.height;
    let byteCounts = [];

    for (var i = 0; i < channelRows; i++) {
      byteCounts.push(file.readShort());
    }

    this.byteCounts = byteCounts;
  }

  _parseChannelData() {
    const channels = this.image.header.channels;
    const height = this.image.header.height;

    for (var i = 0; i < channels; i++) {
      this._decodeRLEChannel();
      this.lineIndex += height;
    }
  }

  _decodeRLEChannel() {
    const { image } = this;
    const { file } = image;
    const height = image.header.height;
    let byteCount, finish, len, val;

    for (var j = 0; j < height; j++) {
      byteCount = this.byteCounts[this.lineIndex + j];
      finish = file.tell() + byteCount;

      while (file.tell() < finish) {
        len = file.readByte();

        if (len < 128) {
          len += 1;
          image.channelData.splice(this.chanPos, 0, ...file.read(len));
          this.chanPos += len;
        } else if (len > 128) {
          len ^= 0xff;
          len += 2;

          val = file.readByte();

          for (let i = 0; i < len; i++) {
            image.channelData[this.chanPos++] = val;
          }
        }
      }
    }
  }
}

export { parseRLE }
