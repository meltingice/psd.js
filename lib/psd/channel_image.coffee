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
  constructor: (file, header, @layer) ->
    # We copy the layer's width and height to private variables because, as you'll see below,
    # the dimensions can change if we're parsing a mask channel.
    @_width = @layer.width
    @_height = @layer.height

    super(file, header)

    @channelsInfo = @layer.channelsInfo
    @hasMask = _.some @channelsInfo, (c) -> c.id < -1
    @opacity = @layer.opacity / 255.0

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

      # If we're working with a mask channel, then the mask can define it's own dimensions separate
      # from the image dimensions. We grab these dimensions from the layer's mask data.
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

  # Initiates parsing of the image data, which is based on the compression type of the channel. Every
  # channel defines it's own compression type, unlike the full PSD preview, which has a single compression
  # type for the entire image.
  parseImageData: ->
    @compression = @parseCompression()

    switch @compression
      when 0 then @parseRaw()
      when 1 then @parseRLE()
      when 2, 3 then @parseZip()
      else @file.seek(@endPos)
