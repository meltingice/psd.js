_           = require 'lodash'
Image       = require './image.coffee'
ImageFormat = require './image_format.coffee'

# Represents an image for a single layer, which differs slightly in format from
# the full size preview image.
# 
# The full preview at the end of the PSD document has the same compression for all
# channels, whereas layer images define the compression per color channel. The
# dimensions can also differ per channel if we're parsing mask data (channel ID < -1).
module.exports = class ChannelImage extends Image
  @includes ImageFormat.LayerRAW
  @includes ImageFormat.LayerRLE

  # Creates a new ChannelImage.
  # 
  # @param [File] The PSD File reference.
  # @param [Header] The PSD header.
  # @param [Layer] The PSD layer for this image.
  constructor: (file, header, @layer) ->
    @_width = @layer.width
    @_height = @layer.height

    super(file, header)

    @channelsInfo = @layer.channelsInfo
    @hasMask = _.any @channelsInfo, (c) -> c.id < -1
    @opacity = @layer.opacity / 255.0
    @maskData = []

  # Skip parsing this image by jumping to the end of the data.
  skip: ->
    for chan in @channelsInfo
      @file.seek chan.length, true

  # The width of the image.
  width: -> @_width

  # The height of the image.
  height: -> @_height

  # The number of color channels in the image.
  channels: -> @layer.channels

  # Parse the image data. The resulting image data will be formatted to match the Javascript
  # Canvas color format, e.g. `[R, G, B, A, R, G, B, A]`.
  parse: ->
    @chanPos = 0
    for chan in @channelsInfo
      if chan.length <= 0
        @parseCompression()
        continue

      @chan = chan

      if chan.id < -1
        @_width = @layer.mask.width
        @_height = @layer.mask.height
      else
        @_width = @layer.width
        @_height = @layer.height

      @length = @_width * @_height
      start = @file.tell()

      @parseImageData()

      finish = @file.tell()

      if finish isnt start + @chan.length
        @file.seek(start + @chan.length)

    @_width = @layer.width
    @_height = @layer.height

    @processImageData()

  # @private
  parseImageData: ->
    @compression = @parseCompression()

    switch @compression
      when 0 then @parseRaw()
      when 1 then @parseRLE()
      when 2, 3 then @parseZip()
      else @file.seek(@endPos)
