{Module} = require 'coffeescript-module'

module.exports = class Layer extends Module
  @includes require('./layer/position_channels.coffee')
  @includes require('./layer/blend_modes.coffee')
  @includes require('./layer/mask.coffee')
  @includes require('./layer/blending_ranges.coffee')
  # @includes require('./layer/channel_image.coffee')

  constructor: (@file, @header) ->
    @mask = {}
    @blendingRanges = {}
    @adjustments = {}
    @channelsInfo = []
    @blendMode = {}
    @groupLayer = null

    @infoKeys = []

  parse: ->
    @parsePositionAndChannels()
    @parseBlendModes()

    extraLen = @file.readInt()
    @layerEnd = @file.tell() + extraLen

    @parseMaskData()
    @parseBlendingRanges()

    @file.seek @layerEnd
    return @

  export: ->
    top: @top
    right: @right
    bottom: @bottom
    left: @left
    width: @width
    height: @height
    opacity: @opacity
    visible: @visible
    clipped: @clipped
    mask: @mask.export()