export default class ChannelImage {
  constructor(layer) {
    this.layer = layer;
    this.file = layer.file;
    this.header = layer.header;
  }

  skip() {
    this.layer.channelsInfo.forEach((channel) => {
      this.file.seek(channel.length, true);
    });
  }

  parse() {
    // TODO
  }
}
