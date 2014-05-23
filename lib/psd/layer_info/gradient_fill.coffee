LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class GradientFill extends LayerInfo
  @shouldParse: (key) -> key is 'GdFl'

  parse: ->
    @file.seek 4, true # Skip sig
    @data = new Descriptor(@file).parse()