LayerInfo = require '../layer_info.coffee'

module.exports = class NestedSectionDivider extends LayerInfo
  @shouldParse: (key) -> key is 'lsdk'

  constructor: (layer, length) ->
    super(layer, length)

    @isFolder = false
    @isHidden = false

  parse: ->
    code = @file.readInt()

    switch code
      when 1, 2 then @isFolder = true
      when 3 then @isHidden = true