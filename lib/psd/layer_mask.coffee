Util = require('./util.coffee')
Layer = require('./layer.coffee')

module.exports = class LayerMask
  constructor: (@file, @header) ->
    @layers = []
    @mergedAlpha = false
    @globalMask = null

  skip: -> @file.seek @file.readInt(), true

  parse: ->
    maskSize = @file.readInt()
    finish = maskSize + @file.tell()

    return if maskSize <= 0

    @parseLayers()
    @parseGlobalMask()

    @layers.reverse()

    @file.seek finish

  parseLayers: ->
    layerInfoSize = Util.pad2 @file.readInt()

    if layerInfoSize > 0
      layerCount = @file.readShort()

      if layerCount < 0
        layerCount = Math.abs layerCount
        @mergedAlpha = true

      for i in [0...layerCount]
        @layers.push new Layer(@file, @header).parse()

  parseGlobalMask: ->