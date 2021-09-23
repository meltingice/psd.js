/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let LegacyTypeTool;
const _ = require('lodash');
const TypeTool = require('./typetool.js');

module.exports = (LegacyTypeTool = class LegacyTypeTool extends TypeTool {
  static shouldParse(key) { return key === 'tySh'; }

  constructor(layer, length) {
    super(layer, length);

    this.transform = {};
    this.faces = [];
    this.styles = [];
    this.lines = [];
    this.type = 0;
    this.scalingFactor = 0;
    this.characterCount = 0;
    this.horzPlace = 0;
    this.vertPlace = 0;
    this.selectStart = 0;
    this.selectEnd = 0;
    this.color = null;
    this.antialias = null;
  }

  parse() {
    let i;
    let asc, end;
    let asc1, end1;
    let asc2, end2;
    this.file.seek(2, true); // Version
    this.parseTransformInfo();

    // Font information
    this.file.seek(2, true);

    const facesCount = this.file.readShort();
    for (i = 0, end = facesCount, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
      this.faces.push(_({}).tap(face => {
        face.mark = this.file.readShort();
        face.fontType = this.file.readInt();
        face.fontName = this.file.readString();
        face.fontFamilyName = this.file.readString();
        face.fontStyleName = this.file.readString();
        face.script = this.file.readShort();
        face.numberAxesVector = this.file.readInt();
        face.vector = [];

        return __range__(0, face.numberAxesVector, false).map((j) =>
          face.vector.push(this.file.readInt()));
      })
      );
    }

    const stylesCount = this.file.readShort();
    for (i = 0, end1 = stylesCount, asc1 = 0 <= end1; asc1 ? i < end1 : i > end1; asc1 ? i++ : i--) {
      this.styles.push(_({}).tap(style => {
        style.mark = this.file.readShort();
        style.faceMark = this.file.readShort();
        style.size = this.file.readInt();
        style.tracking = this.file.readInt();
        style.kerning = this.file.readInt();
        style.leading = this.file.readInt();
        style.baseShift = this.file.readInt();
        style.autoKern = this.file.readBoolean();

        this.file.seek(1, true);

        return style.rotate = this.file.readBoolean();
      })
      );
    }

    this.type = this.file.readShort();
    this.scalingFactor = this.file.readInt();
    this.characterCount = this.file.readInt();
    this.horzPlace = this.file.readInt();
    this.vertPlace = this.file.readInt();
    this.selectStart = this.file.readInt();
    this.selectEnd = this.file.readInt();

    const linesCount = this.file.readShort();
    for (i = 0, end2 = linesCount, asc2 = 0 <= end2; asc2 ? i < end2 : i > end2; asc2 ? i++ : i--) {
      this.lines.push(_({}).tap(function(line) {
        line.charCount = this.file.readInt();
        line.orientation = this.file.readShort();
        line.alignment = this.file.readShort();
        line.actualChar = this.file.readShort();
        return line.style = this.file.readShort();
      })
      );
    }

    this.color = this.file.readSpaceColor();
    return this.antialias = this.file.readBoolean();
  }
});

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}