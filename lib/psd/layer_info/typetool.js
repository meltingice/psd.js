/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let TextElements;
const _ = require('lodash');
const parseEngineData = require('parse-engine-data');
const LayerInfo = require('../layer_info.js');
const Descriptor = require('../descriptor.js');

module.exports = (TextElements = (function() {
  let TRANSFORM_VALUE = undefined;
  let COORDS_VALUE = undefined;
  TextElements = class TextElements extends LayerInfo {
    static initClass() {
  
      TRANSFORM_VALUE = ['xx', 'xy', 'yx', 'yy', 'tx', 'ty'];
      COORDS_VALUE = ['left', 'top', 'right', 'bottom'];
    }
    static shouldParse(key) { return key === 'TySh'; }

    constructor(layer, length) {
      super(layer, length);

      this.version = null;
      this.transform = {};
      this.textVersion = null;
      this.descriptorVersion = null;
      this.textData = null;
      this.engineData = null;
      this.textValue = null;
      this.warpVersion = null;
      this.descriptorVersion = null;
      this.warpData = null;
      this.coords = {};
    }

    parse() {
      this.version = this.file.readShort();

      this.parseTransformInfo();

      this.textVersion = this.file.readShort();
      this.descriptorVersion = this.file.readInt();

      this.textData = new Descriptor(this.file).parse();
      this.textValue = this.textData['Txt '];
      this.engineData = parseEngineData(this.textData.EngineData);

      this.warpVersion = this.file.readShort();

      this.descriptorVersion = this.file.readInt();

      this.warpData = new Descriptor(this.file).parse();

      return Array.from(COORDS_VALUE).map((name, index) =>
        (this.coords[name] = this.file.readInt()));
    }

    parseTransformInfo() {
      return Array.from(TRANSFORM_VALUE).map((name, index) =>
        (this.transform[name] = this.file.readDouble()));
    }

    fonts() {
      if (this.engineData == null) { return []; }
      return this.engineData.ResourceDict.FontSet.map(f => f.Name);
    }

    lengthArray() {
      const arr = this.engineData.EngineDict.StyleRun.RunLengthArray;
      const sum = _.reduce(arr, (m, o) => m + o);
      if ((sum - this.textValue.length) === 1) { arr[arr.length - 1] = arr[arr.length - 1] - 1; }
      return arr;
    }

    fontStyles() {
      const data = this.engineData.EngineDict.StyleRun.RunArray.map(r => r.StyleSheet.StyleSheetData);
      return data.map(function(f) {
        let style;
        if (f.FauxItalic) {
          style = 'italic';
        } else {
          style = 'normal';
        }
        return style;
      });
    }

    fontWeights() {
      const data = this.engineData.EngineDict.StyleRun.RunArray.map(r => r.StyleSheet.StyleSheetData);
      return data.map(function(f) {
        let weight;
        if (f.FauxBold) {
          weight = 'bold';
        } else {
          weight = 'normal';
        }
        return weight;
      });
    }

    textDecoration() {
      const data = this.engineData.EngineDict.StyleRun.RunArray.map(r => r.StyleSheet.StyleSheetData);
      return data.map(function(f) {
        let decoration;
        if (f.Underline) {
          decoration = 'underline';
        } else {
          decoration = 'none';
        }
        return decoration;
      });
    }

    leading() {
      const data = this.engineData.EngineDict.StyleRun.RunArray.map(r => r.StyleSheet.StyleSheetData);
      return data.map(function(f) {
        let leading;
        if (f.Leading) {
          leading = f.Leading;
        } else {
          leading = 'auto';
        }
        return leading;
      });
    }

    sizes() {
      if ((this.engineData == null) && (this.styles().FontSize == null)) { return []; }
      return this.styles().FontSize;
    }

    alignment() {
      if (this.engineData == null) { return []; }
      const alignments = ['left', 'right', 'center', 'justify'];
      return this.engineData.EngineDict.ParagraphRun.RunArray.map(s => alignments[Math.min(parseInt(s.ParagraphSheet.Properties.Justification, 10), 3)]);
    }

    // Return all colors used for text in this layer. The colors are returned in RGBA
    // format as an array of arrays.
    colors() {
      // If the color is opaque black, this field is sometimes omitted.
      if ((this.engineData == null) || (this.styles().FillColor == null)) { return [[0, 0, 0, 255]]; }

      return this.styles().FillColor.map(function(s) {
        const values = s.Values.map(v => Math.round(v * 255));
        values.push(values.shift()); // Change ARGB -> RGBA for consistency
        return values;
      });
    }

    styles() {
      if (this.engineData == null) { return {}; }
      if (this._styles != null) { return this._styles; }

      const data = this.engineData.EngineDict.StyleRun.RunArray.map(r => r.StyleSheet.StyleSheetData);

      return this._styles = _.reduce(data, function(m, o) {
        for (let k of Object.keys(o || {})) {
          const v = o[k];
          if (!m[k]) { m[k] = []; }
          m[k].push(v);
        }
        return m;
      }
      , {});
    }

    // Creates the CSS string and returns it. Each property is newline separated
    // and not all properties may be present depending on the document.
    //
    // Colors are returned in rgba() format and fonts may include some internal
    // Photoshop fonts.
    toCSS() {
      const definition = {
        'font-family': this.fonts().join(', '),
        'font-size': `${this.sizes()[0]}pt`,
        'color': `rgba(${this.colors()[0].join(', ')})`,
        'text-align': this.alignment()[0]
      };

      const css = [];
      for (let k in definition) {
        const v = definition[k];
        if (v == null) { continue; }
        css.push(`${k}: ${v};`);
      }

      return css.join("\n");
    }

    export() {
      return {
        value: this.textValue,
        font: {
          lengthArray: this.lengthArray(),
          styles: this.fontStyles(),
          weights: this.fontWeights(),
          names: this.fonts(),
          sizes: this.sizes(),
          colors: this.colors(),
          alignment: this.alignment(),
          textDecoration: this.textDecoration(),
          leading: this.leading()
        },
        left: this.coords.left,
        top: this.coords.top,
        right: this.coords.right,
        bottom: this.coords.bottom,
        transform: this.transform
      };
    }
  };
  TextElements.initClass();
  return TextElements;
})());
