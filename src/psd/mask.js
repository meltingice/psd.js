export default class Mask {
  top = 0
  right = 0
  bottom = 0
  left = 0

  constructor(file) {
    this.file = file;
  }

  parse() {
    const { file } = this;

    this.size = file.readInt();
    if (this.size === 0) return;

    const maskEnd = file.tell() + this.size;

    this.top = file.readInt();
    this.left = file.readInt();
    this.bottom = file.readInt();
    this.right = file.readInt();

    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.defaultColor = file.readByte();
    this.flags = file.readByte();

    this.relative = (this.flags & 0x01) > 0;
    this.disabled = (this.flags & (0x01 << 1)) > 0;
    this.invert = (this.flags & (0x01 << 2)) > 0;

    file.seek(maskEnd);
  }

  export() {
    if (this.size === 0) return {};

    return {
      top: this.top,
      left: this.left,
      bottom: this.bottom,
      right: this.right,
      width: this.width,
      height: this.height,
      defaultColor: this.defaultColor,
      relative: this.relative,
      disabled: this.disabled,
      invert: this.invert
    }
  }
}
