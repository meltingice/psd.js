import Mask from '../mask'

export default function parseMaskData(layer) {
  const mask = new Mask(layer.file);
  mask.parse();

  layer.mask = mask;
}
