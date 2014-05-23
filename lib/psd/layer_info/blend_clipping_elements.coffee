LayerInfo = require '../layer_info.coffee'

module.exports = class BlendClippingElements extends LayerInfo
  @shouldParse: (key) -> key is 'clbl'

  parse: ->
    @enabled = @file.readBoolean()
    @file.seek 3, true