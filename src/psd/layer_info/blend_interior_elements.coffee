LayerInfo = require '../layer_info.coffee'

module.exports = class BlendInteriorElements extends LayerInfo
  @shouldParse: (key) -> key is 'infx'

  parse: ->
    @enabled = @file.readBoolean()
    @file.seek 3, true