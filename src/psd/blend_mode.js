export default class BlendMode {
  static BLEND_MODES = {
    norm: 'normal',
    dark: 'darken',
    lite: 'lighten',
    hue:  'hue',
    sat:  'saturation',
    colr: 'color',
    lum:  'luminosity',
    mul:  'multiply',
    scrn: 'screen',
    diss: 'dissolve',
    over: 'overlay',
    hLit: 'hard_light',
    sLit: 'soft_light',
    diff: 'difference',
    smud: 'exclusion',
    div:  'color_dodge',
    idiv: 'color_burn',
    lbrn: 'linear_burn',
    lddg: 'linear_dodge',
    vLit: 'vivid_light',
    lLit: 'linear_light',
    pLit: 'pin_light',
    hMix: 'hard_mix',
    pass: 'passthru',
    dkCl: 'darker_color',
    lgCl: 'lighter_color',
    fsub: 'subtract',
    fdiv: 'divide'
  }

  blendKey = null
  opacity = null
  clipping = null
  clipped = null
  flags = null
  mode = null
  visible = null

  constructor(file) {
    this.file = file;
  }

  parse() {
    const { file } = this;
    file.seek(4, true);

    this.blendKey = file.readString(4).trim();
    this.opacity = file.readByte();
    this.clipping = file.readByte();
    this.flags = file.readByte();

    this.mode = BlendMode.BLEND_MODES[this.blendKey];
    this.clipped = this.clipping === 1;

    this.visible = !((this.flags & (0x01 << 1)) > 0);

    file.seek(1, true);
  }

  opacityPercentage() {
    return this.opacity * 100 / 255;
  }
}
