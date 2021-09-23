/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Each layer/group in the PSD document can have a mask, which is
// represented by this class. The mask describes which parts of the
// layer are visible and which are hidden.
let Mask;
module.exports = (Mask = class Mask {
  constructor(file) {
    this.file = file;
    this.top = 0;
    this.right = 0;
    this.bottom = 0;
    this.left = 0;
  }

  parse() {
    // If there is no mask, then this section will have a size of zero
    // and we can move on to the next.
    this.size = this.file.readInt();
    if (this.size === 0) { return this; }

    const maskEnd = this.file.tell() + this.size;

    // First, we parse the coordinates of the mask.
    this.top = this.file.readInt();
    this.left = this.file.readInt();
    this.bottom = this.file.readInt();
    this.right = this.file.readInt();

    // We can then easily derive the dimensions from the box coordinates.
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    // Each mask defines a couple of flags that are used as extra metadata.
    this.relative = (this.flags & 0x01) > 0;
    this.disabled = (this.flags & (0x01 << 1)) > 0;
    this.invert = (this.flags & (0x01 << 2)) > 0;

    this.defaultColor = this.file.readByte();
    this.flags = this.file.readByte();

    this.file.seek(maskEnd);
    return this;
  }

  export() {
    if (this.size === 0) { return {}; }

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
    };
  }
});
