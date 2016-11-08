_ = require 'lodash'
parseEngineData = require 'parse-engine-data'
LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class TextElements extends LayerInfo
  @shouldParse: (key) -> key is 'TySh'

  TRANSFORM_VALUE = ['xx', 'xy', 'yx', 'yy', 'tx', 'ty']
  COORDS_VALUE = ['left', 'top', 'right', 'bottom']

  constructor: (layer, length) ->
    super(layer, length)

    @version = null
    @transform = {}
    @textVersion = null
    @descriptorVersion = null
    @textData = null
    @engineData = null
    @textValue = null
    @warpVersion = null
    @descriptorVersion = null
    @warpData = null
    @coords = {}

  parse: ->
    @version = @file.readShort()

    @parseTransformInfo()

    @textVersion = @file.readShort()
    @descriptorVersion = @file.readInt()

    @textData = new Descriptor(@file).parse()
    @textValue = @textData['Txt ']
    @engineData = parseEngineData(@textData.EngineData)

    @warpVersion = @file.readShort()

    @descriptorVersion = @file.readInt()

    @warpData = new Descriptor(@file).parse()

    for name, index in COORDS_VALUE
      @coords[name] = @file.readInt()

  parseTransformInfo: ->
    for name, index in TRANSFORM_VALUE
      @transform[name] = @file.readDouble()

  fonts: ->
    return [] unless @engineData?
    @engineData.ResourceDict.FontSet.map (f) -> f.Name

  lengthArray: ->
    arr = @engineData.EngineDict.StyleRun.RunLengthArray
    sum = _.reduce(arr, (m, o) -> m + o)
    arr[arr.length - 1] = arr[arr.length - 1] - 1 if sum - @textValue.length == 1
    return arr

  fontStyles: ->
    data = @engineData.EngineDict.StyleRun.RunArray.map (r) ->
      r.StyleSheet.StyleSheetData
    data.map (f) ->
      if f.FauxItalic
        style = 'italic'
      else
        style = 'normal'
      return style

  fontWeights: ->
    data = @engineData.EngineDict.StyleRun.RunArray.map (r) ->
      r.StyleSheet.StyleSheetData
    data.map (f) ->
      if f.FauxBold
        weight = 'bold'
      else
        weight = 'normal'
      return weight

  textDecoration: ->
    data = @engineData.EngineDict.StyleRun.RunArray.map (r) ->
      r.StyleSheet.StyleSheetData
    data.map (f) ->
      if f.Underline
        decoration = 'underline'
      else
        decoration = 'none'
      return decoration

  leading: ->
    data = @engineData.EngineDict.StyleRun.RunArray.map (r) ->
      r.StyleSheet.StyleSheetData
    data.map (f) ->
      if f.Leading
        leading = f.Leading
      else
        leading = 'auto'
      return leading

  sizes: ->
    return [] if not @engineData? and not @styles().FontSize?
    @styles().FontSize

  alignment: ->
    return [] unless @engineData?
    alignments = ['left', 'right', 'center', 'justify']
    @engineData.EngineDict.ParagraphRun.RunArray.map (s) ->
      alignments[Math.min(parseInt(s.ParagraphSheet.Properties.Justification, 10), 3)]

  # Return all colors used for text in this layer. The colors are returned in RGBA
  # format as an array of arrays.
  colors: ->
    # If the color is opaque black, this field is sometimes omitted.
    return [[0, 0, 0, 255]] if not @engineData? or not @styles().FillColor?

    @styles().FillColor.map (s) ->
      values = s.Values.map (v) -> Math.round(v * 255)
      values.push values.shift() # Change ARGB -> RGBA for consistency
      values

  styles: ->
    return {} unless @engineData?
    return @_styles if @_styles?

    data = @engineData.EngineDict.StyleRun.RunArray.map (r) ->
      r.StyleSheet.StyleSheetData

    @_styles = _.reduce(data, (m, o) ->
      for own k, v of o
        m[k] or= []
        m[k].push v
      m
    , {})

  # Creates the CSS string and returns it. Each property is newline separated
  # and not all properties may be present depending on the document.
  #
  # Colors are returned in rgba() format and fonts may include some internal
  # Photoshop fonts.
  toCSS: ->
    definition =
      'font-family': @fonts().join(', ')
      'font-size': "#{@sizes()[0]}pt"
      'color': "rgba(#{@colors()[0].join(', ')})"
      'text-align': @alignment()[0]

    css = []
    for k, v of definition
      continue unless v?
      css.push "#{k}: #{v};"

    css.join("\n")

  export: ->
    value: @textValue
    font:
      lengthArray: @lengthArray()
      styles: @fontStyles()
      weights: @fontWeights()
      names: @fonts()
      sizes: @sizes()
      colors: @colors()
      alignment: @alignment()
      textDecoration: @textDecoration()
      leading: @leading()
    left: @coords.left
    top: @coords.top
    right: @coords.right
    bottom: @coords.bottom
    transform: @transform
