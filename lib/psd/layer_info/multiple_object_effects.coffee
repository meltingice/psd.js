LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class MultipleObjectEffects extends LayerInfo
  @shouldParse: (key) -> key is 'lmfx'

  parse: ->
    @file.seek 8, true
    @data = new Descriptor(@file).parse()
