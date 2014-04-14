Util = require('./util.coffee')

module.exports = class LayerMask
  constructor: (@file, @header) ->
    @layers = []
    @mergedAlpha = false
    @globalMask = null

  skip: -> @file.seek @file.readInt()

  parse: ->
    maskSize = @file.readInt()
    finish = maskSize + @file.tell()
    @file.seek finish
    return

    return if maskSize <= 0

    layerInfoSize = Util.pad2 @file.readInt()

    if layerInfoSize > 0
      layerCount = @file.readShort()

      if layerCount < 0
        layerCount = Math.abs layerCount
        @mergedAlpha = true

