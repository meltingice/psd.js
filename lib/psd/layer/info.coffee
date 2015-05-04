LazyExecute = require '../lazy_execute.coffee'
Util = require '../util.coffee'

LAYER_INFO = {
  blendClippingElements:  require('../layer_info/blend_clipping_elements.coffee')
  blendInteriorElements:  require('../layer_info/blend_interior_elements.coffee')
  fillOpacity:            require('../layer_info/fill_opacity.coffee')
  gradientFill:           require('../layer_info/gradient_fill.coffee')
  layerId:                require('../layer_info/layer_id.coffee')
  layerNameSource:        require('../layer_info/layer_name_source.coffee')
  legacyTypetool:         require('../layer_info/legacy_typetool.coffee')
  locked:                 require('../layer_info/locked.coffee')
  metadata:               require('../layer_info/metadata.coffee')
  name:                   require('../layer_info/unicode_name.coffee')
  nestedSectionDivider:   require('../layer_info/nested_section_divider.coffee')
  objectEffects:          require('../layer_info/object_effects.coffee')
  sectionDivider:         require('../layer_info/section_divider.coffee')
  solidColor:             require('../layer_info/solid_color.coffee')
  typeTool:               require('../layer_info/typetool.coffee')
  vectorMask:             require('../layer_info/vector_mask.coffee')
  vectorOrigination:      require('../layer_info/vector_origination.coffee')
  vectorStroke:           require('../layer_info/vector_stroke.coffee')
  vectorStrokeContent:    require('../layer_info/vector_stroke_content.coffee')
}

module.exports =
  parseLayerInfo: ->
    while @file.tell() < @layerEnd
      @file.seek 4, true # sig

      key = @file.readString(4)
      length = Util.pad2 @file.readInt()
      pos = @file.tell()

      keyParseable = false
      for own name, klass of LAYER_INFO
        continue unless klass.shouldParse(key)

        i = new klass(@, length)
        @adjustments[name] = new LazyExecute(i, @file)
          .now('skip')
          .later('parse')
          .get()

        unless @[name]?
          do (name) => @[name] = => @adjustments[name]

        @infoKeys.push key
        keyParseable = true
        break

      @file.seek length, true if not keyParseable
