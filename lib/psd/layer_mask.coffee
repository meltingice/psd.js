_ = require 'lodash'
Util = require './util.coffee'
Layer = require './layer.coffee'

# The layer mask is the overarching data structure that describes both
# the layers/groups in the PSD document, and the global mask.
# This part of the document is ordered as such:
# 
# * Layers
# * Layer images
# * Global Mask
# 
# The file does not need to have a global mask. If there is none, then
# its length will be zero.
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

    # The layers are stored in the reverse order that we would like them. In other
    # words, they're stored bottom to top and we want them top to bottom.
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
