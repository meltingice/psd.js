export default function parsePositionAndChannels(layer) {
  const { file } = layer;

  layer.top = file.readInt();
  layer.left = file.readInt();
  layer.bottom = file.readInt();
  layer.right = file.readInt();
  layer.channels = file.readShort();

  layer.rows = layer.height = layer.bottom - layer.top;
  layer.cols = layer.width = layer.right - layer.left;

  let id, length;
  for (var i = 0; i < layer.channels; i++) {
    id = file.readShort();
    length = file.readInt();

    layer.channelsInfo.push({ id, length });
  }
}
