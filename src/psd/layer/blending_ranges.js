export default function parseBlendingRanges(layer) {
  const { file } = layer;
  const length = file.readInt();

  layer.blendingRanges.grey = {
    source: {
      black: [file.readByte(), file.readByte()],
      white: [file.readByte(), file.readByte()]
    },
    dest: {
      black: [file.readByte(), file.readByte()],
      white: [file.readByte(), file.readByte()]
    }
  }

  const numChannels = (length - 8) / 8;

  layer.blendingRanges.channels = [];
  for (var i = 0; i < numChannels; i++) {
    layer.blendingRanges.channels.push({
      source: {
        black: [file.readByte(), file.readByte()],
        white: [file.readByte(), file.readByte()]
      },
      dest: {
        black: [file.readByte(), file.readByte()],
        white: [file.readByte(), file.readByte()]
      }
    })
  }
}
