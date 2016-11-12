LayerInfo = require '../layer_info.coffee'

module.exports = class Locked extends LayerInfo
  @shouldParse: (key) -> key is 'lspf'

  constructor: (layer, length) ->
    super(layer, length)

    @transparencyLocked = false
    @compositeLocked = false
    @positionLocked = false
    @allLocked = false

  parse: ->
    locked = @file.readInt()

    @transparencyLocked = (locked & (0x01 << 0)) > 0 || locked == -2147483648
    @compositeLocked = (locked & (0x01 << 1)) > 0 || locked == -2147483648
    @positionLocked = (locked & (0x01 << 2)) > 0 || locked == -2147483648

    @allLocked = @transparencyLocked and @compositeLocked and @positionLocked