LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class ObjectEffects extends LayerInfo
  @shouldParse: (key) -> key in ['lfx2', 'lmfx']

  parse: ->
    @file.seek 8, true
    @data = new Descriptor(@file).parse()
