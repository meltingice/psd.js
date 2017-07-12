import BlendMode from '../blend_mode'

export default function parseBlendModes(layer) {
  const { file } = layer;
  const blendMode = new BlendMode(file);
  blendMode.parse();

  layer.opacity = blendMode.opacity;
  layer.visible = blendMode.visible;
  layer.clipped = blendMode.clipped;

  layer.blendMode = blendMode;
}
