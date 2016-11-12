LayerInfo = require '../layer_info.coffee'

module.exports = class FillOpacity extends LayerInfo
  @shouldParse: (key) -> key is 'iOpa'

  parse: ->
    @value = @file.readByte()