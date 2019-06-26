LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class ObjectEffects extends LayerInfo
  @shouldParse: (key) -> key is 'lfx2'

  parse: ->
    console.log('build test')
    @file.seek 8, true
    @data = new Descriptor(@file).parse()
