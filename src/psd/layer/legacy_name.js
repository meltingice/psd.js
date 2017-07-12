import { pad4 } from '../util'

export default function parseLegacyLayerName(layer) {
  const { file } = layer;
  const len = pad4(file.readByte());
  layer.legacyName = file.readString(len);
}
