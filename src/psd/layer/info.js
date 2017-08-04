import { pad2 } from '../util'
import LazyExecute from '../lazy_execute'

import Artboard from './info/artboard'
import BlendClippingElements from './info/blend_clipping_elements'
import TypeTool from './info/typetool'
import UnicodeName from './info/unicode_name'

const LAYER_INFO = [
  Artboard,
  BlendClippingElements,
  TypeTool,
  UnicodeName
];

export default function parseLayerInfo(layer) {
  const { file } = layer;

  let key, length, pos, keyParseable;
  let infoClass, info;
  while (file.tell() < layer.layerEnd) {
    // We can ignore the sig, or alternatively do a sanity check here.
    file.seek(4, true);

    key = file.readString(4);
    layer.availableInfoKeys.push(key);

    length = pad2(file.readInt());
    pos = file.tell();

    keyParseable = false;
    for (var i = 0; i < LAYER_INFO.length; i++) {
      infoClass = LAYER_INFO[i];

      if (!infoClass.shouldParse(key)) continue;

      info = new infoClass(layer, length);
      layer.adjustments[infoClass.name] = new LazyExecute(info, file)
        .now('skip')
        .later('parse')
        .get();

      layer.parsedInfoKeys.push(key);
      keyParseable = true;

      break;
    }

    if (!keyParseable) file.seek(length, true);
  }
}
