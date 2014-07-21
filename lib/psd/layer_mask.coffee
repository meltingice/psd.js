_ = require 'lodash'
Util = require './util.coffee'
Layer = require './layer.coffee'

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

      layer.parseChannelImage() for layer in @layers

  parseGlobalMask: ->
    length = @file.readInt()
    return if length <= 0

    maskEnd = @file.tell() + length

    @globalMask = _({}).tap (mask) =>
      mask.overlayColorSpace = @file.readShort()
      mask.colorComponents = [
        @file.readShort() >> 8
        @file.readShort() >> 8
        @file.readShort() >> 8
        @file.readShort() >> 8
      ]

      mask.opacity = @file.readShort() / 16.0

      # 0 = color selected, 1 = color protected, 128 = use value per layer
      mask.kind = @file.readByte()

    @file.seek maskEnd
