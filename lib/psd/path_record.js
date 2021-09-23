/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let PathRecord;
const _ = require('lodash');

// A path record describes a single point in a vector path. This is used
// in a couple of different places, but most notably in vector shapes.
module.exports = (PathRecord = class PathRecord {
  constructor(file) {
    this.file = file;
    this.recordType = null;
  }

  parse() {
    this.recordType = this.file.readShort();

    switch (this.recordType) {
      case 0: case 3: return this._readPathRecord();
      case 1: case 2: case 4: case 5: return this._readBezierPoint();
      case 7: return this._readClipboardRecord();
      case 8: return this._readInitialFill();
      default: return this.file.seek(24, true);
    }
  }

  export() {
    return _.merge({ recordType: this.recordType }, (() => { switch (this.recordType) {
      case 0: case 3: return { numPoints: this.numPoints };
      case 1: case 2: case 4: case 5:
        return {
          linked: this.linked,
          closed: ([1, 2].includes(this.recordType)),
          preceding: {
            vert: this.precedingVert,
            horiz: this.precedingHoriz
          },
          anchor: {
            vert: this.anchorVert,
            horiz: this.anchorHoriz
          },
          leaving: {
            vert: this.leavingVert,
            horiz: this.leavingHoriz
          }
        };
      case 7:
        return {
          clipboard: {
            top: this.clipboardTop,
            left: this.clipboardLeft,
            bottom: this.clipboardBottom,
            right: this.clipboardRight,
            resolution: this.clipboardResolution
          }
        };
      case 8: return { initialFill: this.initialFill };
      default: return {};
    } })());
  }

  isBezierPoint() { return [1, 2, 4, 5].includes(this.recordType); }

  _readPathRecord() {
    this.numPoints = this.file.readShort();
    return this.file.seek(22, true);
  }

  _readBezierPoint() {
    this.linked = [1, 4].includes(this.recordType);

    this.precedingVert = this.file.readPathNumber();
    this.precedingHoriz = this.file.readPathNumber();

    this.anchorVert = this.file.readPathNumber();
    this.anchorHoriz = this.file.readPathNumber();

    this.leavingVert = this.file.readPathNumber();
    return this.leavingHoriz = this.file.readPathNumber();
  }

  _readClipboardRecord() {
    this.clipboardTop = this.file.readPathNumber();
    this.clipboardLeft = this.file.readPathNumber();
    this.clipboardBottom = this.file.readPathNumber();
    this.clipboardRight = this.file.readPathNumber();
    this.clipboardResolution = this.file.readPathNumber();
    return this.file.seek(4, true);
  }

  _readInitialFill() {
    this.initialFill = this.file.readShort();
    return this.file.seek(22, true);
  }
});
