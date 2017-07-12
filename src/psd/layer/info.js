import { pad2 } from '../util'

const LAYER_INFO = [

];

const LAYER_INFO_LENGTH = LAYER_INFO.length;

export default function parseLayerInfo(layer) {
  const { file } = layer;

  let key, length, pos, keyParseable;
  let infoClass, info;
  while (file.tell() < layer.layerEnd) {
    // We can ignore the sig, or alternatively do a sanity check here.
    file.seek(4, true);

    key = file.readString(4);
    length = pad2(file.readInt());
    pos = file.tell();

    keyParseable = false;
    for (var i = 0; i < LAYER_INFO_LENGTH; i++) {
      infoClass = LAYER_INFO[i];

      if (!infoClass.shouldParse(key)) continue;

      info = new infoClass(layer, length);
      layer.adjustments[infoClass.name] = new LazyExecute(info, file)
        .now('skip')
        .later('parse')
        .get();

      layer.infoKeys.push(key);
      keyParseable = true;

      break;
    }

    if (!keyParseable) file.seek(length, true);
  }
}
