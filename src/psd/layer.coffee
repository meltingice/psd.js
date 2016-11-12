{Module} = require 'coffeescript-module'

# Represents a single layer and all of the data associated with
# that layer. Typically you will access this data from a Node
# object, which simplifies access for you.
module.exports = class Layer extends Module
  # Mixins for all of the various data each layer contains.
  @includes require('./layer/position_channels.coffee')
  @includes require('./layer/blend_modes.coffee')
  @includes require('./layer/mask.coffee')
  @includes require('./layer/blending_ranges.coffee')
  @includes require('./layer/name.coffee')
  @includes require('./layer/info.coffee')
  @includes require('./layer/helpers.coffee')
  @includes require('./layer/channel_image.coffee')

  constructor: (@file, @header) ->
    @mask = {}
    @blendingRanges = {}
    @adjustments = {}
    @channelsInfo = []
    @blendMode = {}
    @groupLayer = null

    @infoKeys = []

    # The layer's name can come from one of two places, depending on 
    # what version of Photoshop was used to create the PSD.
    Object.defineProperty @, 'name',
      get: ->
        if @adjustments['name']?
          @adjustments['name'].data
        else
          @legacyName

  # Every layer starts with the same set of data, and ends with a dynamic
  # number of layer info blocks.
  parse: ->
    @parsePositionAndChannels()
    @parseBlendModes()

    extraLen = @file.readInt()
    @layerEnd = @file.tell() + extraLen

    @parseMaskData()
    @parseBlendingRanges()
    @parseLegacyLayerName()
    @parseLayerInfo()

    @file.seek @layerEnd
    return @

  export: ->
    name: @name
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
