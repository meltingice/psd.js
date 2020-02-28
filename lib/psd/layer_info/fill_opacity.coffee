LayerInfo = require '../layer_info.coffee'

module.exports = class FillOpacity extends LayerInfo
  @shouldParse: (key) -> key is 'iOpa'

  constructor: (layer, length) ->
    super(layer, length)
    @value = 255

  parse: ->
    @value = @file.readByte()
    
  opacity: -> @value
