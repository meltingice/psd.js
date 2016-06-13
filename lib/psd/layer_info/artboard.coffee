LayerInfo = require '../layer_info.coffee'
Descriptor = require '../descriptor.coffee'

module.exports = class Artboard extends LayerInfo
  @shouldParse: (key) -> key is 'artb'

  parse: ->
    @file.seek 4, true
    @data = new Descriptor(@file).parse()

  export: ->
    coords:
      left: @data.artboardRect['Left']
      top: @data.artboardRect['Top ']
      right: @data.artboardRect['Rght']
      bottom: @data.artboardRect['Btom']
