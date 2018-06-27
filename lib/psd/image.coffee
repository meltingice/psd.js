{Module}    = require 'coffeescript-module'

ImageFormat = require './image_format.coffee'
ImageMode   = require './image_mode.coffee'
Export      = require './image_export.coffee'

# Represents the full preview image at the end of the PSD document. For this image, the
# compression is defined for all channels, and there is no mask data. The width and height
# are derived from the PSD header, which is the full size of the PSD document.
module.exports = class Image extends Module
  # Here we include all of our important mixins.
  @includes ImageFormat.RAW
  @includes ImageFormat.RLE
  @includes ImageMode.Greyscale
  @includes ImageMode.RGB
  @includes ImageMode.CMYK
  @includes Export.PNG
  
  # Images can be 1 of 4 different compression types. RLE is the most prevalent, followed by
  # RAW. ZIP compression only happens under special circumstances, and is somewhat rare.
  COMPRESSIONS = [
    'Raw'
    'RLE'
    'ZIP'
    'ZIPPrediction'
  ]

  constructor: (@file, @header) ->
    # We can easily calculate the number of pixels with the width and height.
    @numPixels = @width() * @height()
    @numPixels *= 2 if @depth() is 16

    @calculateLength()

    # The resulting array that stores the pixel data, formatted in RGBA format.
    @pixelData = new Uint8Array(@channelLength * 4)
    @maskData =  new Uint8Array(@maskLength * 4)

    # This temporarily holds the raw channel data after it's been parsed, but not
    # processed.
    @channelData = new Uint8Array(@length + @maskLength)

    @opacity = 1.0
    @hasMask = false

    @startPos = @file.tell()
    @endPos = @startPos + @length

    @setChannelsInfo()

  # Some helper methods that grab data from the PSD header.
  for attr in ['width', 'height', 'channels', 'depth', 'mode'] then do (attr) =>
    @::[attr] = -> @header[attr]

  # Sets the channel info based on the PSD color mode.
  setChannelsInfo: ->
    switch @mode()
      when 1 then @setGreyscaleChannels()
      when 3 then @setRgbChannels()
      when 4 then @setCmykChannels()

  # Calculates the length of the image data.
  calculateLength: ->
    @length = switch @depth()
      when 1 then (@width() + 7) / 8 * @height()
      when 16 then @width() * @height() * 2
      else @width() * @height()

    @channelLength = @length
    @length *= @channels()

    if @layer and @layer.mask.size
      @maskLength = @layer.mask.width * @layer.mask.height
    else
      @maskLength = 0

  # Parses the image and formats the image data.
  parse: ->
    @compression = @parseCompression()

    if @compression in [2, 3]
      @file.seek @endPos
      return

    @parseImageData()

  # Parses the compression mode.
  parseCompression: -> @file.readShort()
    
  # Parses the image data based on the compression mode.
  parseImageData: ->
    switch @compression
      when 0 then @parseRaw()
      when 1 then @parseRLE()
      when 2, 3 then @parseZip()
      else @file.seek(@endPos)

    @processImageData()

  # Processes the parsed image data based on the color mode.
  processImageData: ->
    switch @mode()
      when 1 then @combineGreyscaleChannel()
      when 3 then @combineRgbChannel()
      when 4 then @combineCmykChannel()

    @channelData = null
