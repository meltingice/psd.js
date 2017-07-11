export default class Header {
  static MODES = [
    'Bitmap',
    'GrayScale',
    'IndexedColor',
    'RGBColor',
    'CMYKColor',
    'HSLColor',
    'HSBColor',
    'Multichannel',
    'Duotone',
    'LabColor',
    'Gray16',
    'RGB48',
    'Lab48',
    'CMYK64',
    'DeepMultichannel',
    'Duotone16'
  ];

  // The signature of the PSD. Should be 8BPS.
  sig = null;

  // The version of the PSD. Should be 1.
  version = null;

  // The number of color channels in the PSD.
  channels = null;

  // The height of the PSD. Can also be accessed with `height`.
  rows = null;

  // The width of the PSD. Can also be accessed with `width`.
  cols = null;

  // The bit depth of the PSD.
  depth = null;

  // The color mode of the PSD.
  mode = null;

  constructor(file) {
    this.file = file;
  }

  parse() {
    const { file } = this;

    this.sig = file.readString(4);
    this.version = file.readUShort();

    file.seek(6, true);

    this.channels = file.readUShort();
    this.rows = this.height = file.readUInt();
    this.cols = this.width = file.readUInt();
    this.depth = file.readUShort();
    this.mode = file.readUShort();

    const colorDataLen = file.readUInt();
    file.seek(colorDataLen, true);
  }

  modeName() {
    return Header.MODES[this.mode];
  }

  export() {
    return {
      sig: this.sig,
      version: this.version,
      channels: this.channels,
      rows: this.rows,
      cols: this.cols,
      depth: this.depth,
      mode: this.mode
    };
  }
}
