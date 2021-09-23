/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const LazyExecute = require('../lazy_execute.js');
const Util = require('../util.js');

// This is an incredibly important object because the majority of the layer information
// is contained in layer info blocks. The keys of this object define how the layer info
// can be accessed. Each layer info block contains different data, so accessing the data
// within each differs from type to type.
//
// Here's an example of how to access some of this data:
//
// ``` coffeescript
// node = psd.tree().childrenAtPath('path/to/layer')[0]
// node.get('locked').allLocked
// node.get('metadata').data.layerComp
// node.get('typeTool').export()
// ```
const LAYER_INFO = {
  artboard:               require('../layer_info/artboard.js'),
  blendClippingElements:  require('../layer_info/blend_clipping_elements.js'),
  blendInteriorElements:  require('../layer_info/blend_interior_elements.js'),
  fillOpacity:            require('../layer_info/fill_opacity.js'),
  gradientFill:           require('../layer_info/gradient_fill.js'),
  layerId:                require('../layer_info/layer_id.js'),
  layerNameSource:        require('../layer_info/layer_name_source.js'),
  legacyTypetool:         require('../layer_info/legacy_typetool.js'),
  locked:                 require('../layer_info/locked.js'),
  metadata:               require('../layer_info/metadata.js'),
  name:                   require('../layer_info/unicode_name.js'),
  nestedSectionDivider:   require('../layer_info/nested_section_divider.js'),
  objectEffects:          require('../layer_info/object_effects.js'),
  sectionDivider:         require('../layer_info/section_divider.js'),
  solidColor:             require('../layer_info/solid_color.js'),
  typeTool:               require('../layer_info/typetool.js'),
  vectorMask:             require('../layer_info/vector_mask.js'),
  vectorOrigination:      require('../layer_info/vector_origination.js'),
  vectorStroke:           require('../layer_info/vector_stroke.js'),
  vectorStrokeContent:    require('../layer_info/vector_stroke_content.js')
};

module.exports = {
  parseLayerInfo() {
    // Layer info blocks are the last section in the layer, so we can continue until our
    // file cursor reaches the end of the layer.
    return (() => {
      const result = [];
      while (this.file.tell() < this.layerEnd) {
        this.file.seek(4, true); // sig

        // Every layer info block is identified by a unique 4 character string.
        const key = this.file.readString(4);
        const length = Util.pad2(this.file.readInt());
        const pos = this.file.tell();

        let keyParseable = false;
        for (let name of Object.keys(LAYER_INFO || {})) {
          const klass = LAYER_INFO[name];
          if (!klass.shouldParse(key)) { continue; }

          // Once we find the right class to handle the layer info block, we create it and
          // register it with LazyExecute. This allows us to parse the PSD significantly
          // faster because we don't bother parsing the layer info block until it's accessed.
          const i = new klass(this, length);
          this.adjustments[name] = new LazyExecute(i, this.file)
            .now('skip')
            .later('parse')
            .get();

          // We create a function that lets us easily access the data.
          if (this[name] == null) {
            (name => { return this[name] = () => this.adjustments[name]; })(name);
          }

          // For debugging purposes, we store every key that we can parse.
          this.infoKeys.push(key);
          keyParseable = true;
          break;
        }

        // If we don't know how to parse this particular layer info block, we can skip it since we
        // know the end position of the data.
        if (!keyParseable) { result.push(this.file.seek(length, true)); } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
};
