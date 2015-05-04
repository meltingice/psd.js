LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class VectorOrigination extends LayerInfo
  @shouldParse: (key) -> key is 'vogk'

  parse: ->
    @file.seek 8, true
    @data = new Descriptor(@file).parse()
