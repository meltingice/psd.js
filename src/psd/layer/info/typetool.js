import parseEngineData from 'parse-engine-data'
import LayerInfo from './base'
import Descriptor from '../../descriptor'

const TRANSFORM_VALUE = ['xx', 'xy', 'yx', 'yy', 'tx', 'ty'];
const COORDS_VALUE = ['left', 'top', 'right', 'bottom'];
const ALIGNMENTS = ['left', 'right', 'center', 'justify'];

export default class TypeTool extends LayerInfo {
  static name = "typeTool"
  static shouldParse(key) {
    return key === "TySh";
  }

  version = null;
  transform = {};
  textVersion = null;
  textDescriptorVersion = null;
  textData = null;
  engineData = null;
  textValue = null;
  warpVersion = null;
  warpDescriptorVersion = null;
  warpData = null;
  coords = {};

  parse() {
    const { file } = this;

    this.version = file.readShort();

    this._parseTransformInfo();

    this.textVersion = file.readShort();
    this.textDescriptorVersion = file.readInt();

    this.textData = (new Descriptor(file)).parse();
    this.textValue = this.textData['Txt '];
    this.engineData = parseEngineData(this.textData.EngineData);

    this.warpVersion = file.readShort();
    this.warpDescriptorVersion = file.readInt();
    this.warpData = (new Descriptor(file)).parse();

    this._parseCoordinates();
  }

  _parseTransformInfo() {
    for (var i = 0; i < TRANSFORM_VALUE.length; i++) {
      this.transform[TRANSFORM_VALUE[i]] = this.file.readDouble();
    }
  }

  _parseCoordinates() {
    for (var i = 0; i < COORDS_VALUE.length; i++) {
      this.coords[COORDS_VALUE[i]] = this.file.readInt();
    }
  }

  fonts() {
    if (!this.engineData) return [];
    return this.engineData.ResourceDict.FontSet.map(f => f.Name);
  }

  lengthArray() {
    const arr = this.engineData.EngineDict.StyleRun.RunLengthArray;
    const sum = arr.reduce((m, o) => m + o);

    if (sum - this.textValue.length === 1) {
      arr[arr.length - 1] = arr[arr.length - 1] - 1;
    }

    return arr;
  }

  stylesheetData() {
    return this.
      engineData.
      EngineDict.
      StyleRun.
      RunArray.
      map(r => r.StyleSheet.StyleSheetData);
  }

  fontStyles() {
    return this.stylesheetData().map(f => f.FauxItalic ? 'italic' : 'normal');
  }

  fontWeights() {
    return this.stylesheetData().map(f => f.FauxBold ? 'bold' : 'normal');
  }

  textDecoration() {
    return this.stylesheetData().map(f => f.Underline ? 'underline' : 'none');
  }

  leading() {
    return this.stylesheetData().map(f => f.Leading || 'auto');
  }

  sizes() {
    if (!this.engineData && !this.styles().FontSize) return [];
    return this.styles().FontSize;
  }

  alignment() {
    if (!this.engineData) return [];
    return this.engineData.EngineDict.ParagraphRun.RunArray.map(s => {
      return ALIGNMENTS[Math.min(parseInt(s.ParagraphSheet.Properties.Justification, 10), 3)];
    })
  }

  colors() {
    if (!this.engineData || !this.styles().FillColor) {
      return [[0, 0, 0, 255]];
    }

    let values;
    return this.styles().FillColor.map(s => {
      values = s.Values.map(v => Math.round(v * 255));
      values.push(values.shift()); // Change ARGB -> RGBA for consistency
      return values;
    });
  }

  styles() {
    if (!this.engineData) return {};
    return this.stylesheetData().reduce((m, o) => {
      for (var k in o) {
        if (!m[k]) m[k] = [];
        m[k].push(o[k])
      }

      return m;
    }, {});
  }

  toCSS() {
    const definition = {
      'font-family': this.fonts().join(', '),
      'font-size': `${this.sizes()[0]}pt`,
      'color': `rgba(${this.colors()[0].join(', ')})`,
      'text-align': this.alignment()[0]
    };

    let css = [];
    for (var k in definition) {
      if (!definition[k]) continue;
      css.push(`${k}: ${definition[k]};`);
    }

    return css.join("\n");
  }

  export() {
    return {
      value: this.textValue,
      font: {
        lengthArray: this.lengthArray(),
        styles: this.styles(),
        weights: this.fontWeights(),
        names: this.fonts(),
        sizes: this.sizes(),
        colors: this.colors(),
        alignment: this.alignment(),
        textDecoration: this.textDecoration(),
        leading: this.leading()
      },
      coords: this.coords,
      transform: this.transform
    }
  }
}
