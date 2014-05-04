LayerInfo = require '../layer_info.coffee'

module.exports = class NestedSectionDivider extends LayerInfo
  @shouldParse: (key) -> key is 'lsct'

  SECTION_DIVIDER_TYPES = [
    'other'
    'open folder'
    'closed folder'
    'bounding section divider'
  ]

  constructor: (layer, length) ->
    super(layer, length)

    @isFolder = false
    @isHidden = false
    @layerType = null
    @blendMode = null
    @subType = null

  parse: ->
    code = @file.readInt()

    @layerType = SECTION_DIVIDER_TYPES[code]

    switch code
      when 1, 2 then @isFolder = true
      when 3 then @isHidden = true

    return unless @length >= 12

    @file.seek 4, true
    @blendMode = @file.readString(4)

    return unless @length >= 16

    @subType = if @file.readInt() is 0 then 'normal' else 'scene group'