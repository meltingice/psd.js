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

    for name, index in TRANSFORM_VALUE
      @transform[name] = @file.readDouble()

    @textVersion = @file.readShort()
    @descriptorVersion = @file.readInt()

    @textData = new Descriptor(@file).parse()
    @textValue = @textData['Txt ']
    @engineData = parseEngineData(@textData.EngineData)

    @warpVersion = @file.readShort()

    @descriptorVersion = @file.readInt()

    @warpData = new Descriptor(@file).parse()

    for name, index in COORDS_VALUE
      @coords[name] = @file.readDouble()

  fonts: ->
    return [] unless @engineData?
    @engineData.ResourceDict.FontSet.map (f) -> f.Name
