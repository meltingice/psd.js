LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class VectorStrokeContent extends LayerInfo
  @shouldParse: (key) -> key is 'vscg'

  parse: ->
    @file.seek 8, true
    @data = new Descriptor(@file).parse()
